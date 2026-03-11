/* ============================================================
 * POST /api/magus/run — Execute a single MAGUS stage via SSE
 * ============================================================
 * PRD §6.5 — "POST /api/magus/run { stage, config }"
 *
 * Accepts:
 *   - stage: StageKey
 *   - config: Record<string, any>  (stage-specific parameters)
 *   - file (FormData, optional — only for "input" stage)
 *
 * Returns: text/event-stream with:
 *   event: stdout  → { line: string }
 *   event: stderr  → { line: string }
 *   event: status  → { status, outputFiles?, error? }
 * ============================================================ */

import { NextRequest } from "next/server";
import { writeFile, mkdir, readdir, stat } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

import { compileWorkflow, type StageKey } from "@/lib/magus/compileWorkflow";
import { spawnStage } from "@/lib/execution/runMAGUS";
import { validateSequenceFile } from "@/lib/uploads/validate";
import { sanitizeFilename } from "@/lib/uploads/sanitize";
import {
  MAX_MAGUS_UPLOAD_SIZE,
  ABSOLUTE_MAX_UPLOAD_SIZE,
} from "@/lib/uploads/limits";
import { validateSession, SESSION_COOKIE } from "@/lib/db/sessions";
import { recordUsageEvent } from "@/lib/db/usage";

/* ---- SSE helper ---- */

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/* ---- Output file discovery ---- */

async function discoverOutputFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      if (entry.isFile()) {
        files.push(entry.name);
      }
    }
    return files;
  } catch {
    return [];
  }
}

/* ---- Route ---- */

export async function POST(req: NextRequest) {
  try {
    /* ---- identify user for usage tracking ---- */
    const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
    const sessionUser = sessionToken ? validateSession(sessionToken) : null;

    const contentType = req.headers.get("content-type") ?? "";
    let stage: StageKey;
    let config: Record<string, any> = {};
    let inputFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      /* FormData body (used when uploading an input file) */
      const formData = await req.formData();
      stage = formData.get("stage") as StageKey;
      const configRaw = formData.get("config");
      if (configRaw) config = JSON.parse(String(configRaw));

      const file = formData.get("file");
      if (file instanceof File) inputFile = file;
    } else {
      /* JSON body */
      const body = await req.json();
      stage = body.stage;
      config = body.config ?? {};
    }

    if (!stage) {
      return new Response(
        JSON.stringify({ error: "Missing 'stage' field" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    /* ---- job directory ---- */
    const runId = randomUUID();
    const jobDir = path.join(process.cwd(), "jobs", runId);
    const inputDir = path.join(jobDir, "input");
    const outputDir = path.join(jobDir, "output", stage);

    await mkdir(inputDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });

    /* ---- handle input file ---- */
    if (inputFile) {
      if (inputFile.size === 0) {
        return new Response(
          JSON.stringify({ error: "Empty file uploaded" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      if (inputFile.size > ABSOLUTE_MAX_UPLOAD_SIZE) {
        return new Response(
          JSON.stringify({ error: "File exceeds maximum upload size" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      if (inputFile.size > MAX_MAGUS_UPLOAD_SIZE) {
        return new Response(
          JSON.stringify({ error: "File too large for MAGUS" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      const buffer = Buffer.from(await inputFile.arrayBuffer());
      validateSequenceFile(buffer, inputFile.name);
      const safeName = sanitizeFilename(inputFile.name);
      await writeFile(path.join(inputDir, safeName), buffer);
    }

    /* ---- compile the single stage into steps ---- */
    const workflowState = {
      stages: {
        input: { enabled: stage === "input", config: {} },
        preprocessing: { enabled: stage === "preprocessing", config },
        assembly: { enabled: stage === "assembly", config },
        taxonomy: { enabled: stage === "taxonomy", config },
        specialized: { enabled: stage === "specialized", config },
        annotation: { enabled: stage === "annotation", config },
        phylogeny: { enabled: stage === "phylogeny", config },
      },
    };
    const steps = compileWorkflow(workflowState);

    /* ---- SSE stream ---- */
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(
              sseEvent("status", { status: "running" })
            )
          );

          if (steps.length === 0 && stage === "input") {
            /* Input stage has no execution — just accepts the file */
            controller.enqueue(
              encoder.encode(
                sseEvent("stdout", { line: "Input file uploaded successfully." })
              )
            );
            controller.enqueue(
              encoder.encode(
                sseEvent("status", {
                  status: "success",
                  outputFiles: inputFile ? [sanitizeFilename(inputFile.name)] : [],
                })
              )
            );
            controller.close();
            return;
          }

          for (const step of steps) {
            const stepStart = Date.now();
            await spawnStage({
              jobDir,
              step,
              onStdout(line) {
                controller.enqueue(
                  encoder.encode(sseEvent("stdout", { line }))
                );
              },
              onStderr(line) {
                controller.enqueue(
                  encoder.encode(sseEvent("stderr", { line }))
                );
              },
            });

            /* Record usage for this step */
            if (sessionUser) {
              const elapsed = Date.now() - stepStart;
              recordUsageEvent({
                userId: sessionUser.id,
                tool: "magus",
                stage: step.id ?? stage,
                status: "completed",
                durationMs: elapsed,
                metadata: { runId, step: step.id },
              });
            }
          }

          const outputFiles = await discoverOutputFiles(outputDir);

          controller.enqueue(
            encoder.encode(
              sseEvent("status", { status: "success", outputFiles })
            )
          );
        } catch (err: any) {
          /* Record failed usage */
          if (sessionUser) {
            recordUsageEvent({
              userId: sessionUser.id,
              tool: "magus",
              stage,
              status: "failed",
              durationMs: 0,
              metadata: { runId, error: err?.message },
            });
          }
          controller.enqueue(
            encoder.encode(
              sseEvent("status", {
                status: "error",
                error: err?.message ?? "Stage execution failed",
              })
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message ?? "MAGUS run failed" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}
