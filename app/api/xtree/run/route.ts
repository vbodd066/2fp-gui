/* ============================================================
 * POST /api/xtree/run — Execute XTree via SSE
 * ============================================================
 * PRD §5.4 — direct SSE streaming, no queue.
 *
 * Accepts FormData:
 *   - file: sequence file (FASTA/FASTQ)
 *   - mapFile: optional mapping file (BUILD mode)
 *   - params: JSON string of XTreeRunParams
 *
 * Returns: text/event-stream with:
 *   event: stdout  → { line: string }
 *   event: stderr  → { line: string }
 *   event: status  → { status, outputFiles?, error? }
 * ============================================================ */

import { NextRequest } from "next/server";
import { writeFile, mkdir, readdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

import { spawnXTree } from "@/lib/execution/runXTree";
import { validateSequenceFile } from "@/lib/uploads/validate";
import { sanitizeFilename } from "@/lib/uploads/sanitize";
import {
  MAX_XTREE_UPLOAD_SIZE,
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
    return entries.filter((e) => e.isFile()).map((e) => e.name);
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

    const formData = await req.formData();

    /* -------------------- sequence file -------------------- */
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: "Sequence file is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (file.size === 0) {
      return new Response(
        JSON.stringify({ error: "Empty file uploaded" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (file.size > ABSOLUTE_MAX_UPLOAD_SIZE) {
      return new Response(
        JSON.stringify({ error: "File exceeds absolute maximum upload size" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    if (file.size > MAX_XTREE_UPLOAD_SIZE) {
      return new Response(
        JSON.stringify({ error: "File too large for XTree" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    validateSequenceFile(buffer, file.name);

    /* -------------------- optional map file -------------------- */
    const mapFileEntry = formData.get("mapFile");
    let mapBuffer: Buffer | null = null;
    let mapFilename: string | null = null;
    if (mapFileEntry instanceof File && mapFileEntry.size > 0) {
      mapBuffer = Buffer.from(await mapFileEntry.arrayBuffer());
      mapFilename = sanitizeFilename(mapFileEntry.name);
    }

    /* -------------------- params -------------------- */
    const paramsRaw = formData.get("params");
    if (!paramsRaw) {
      return new Response(
        JSON.stringify({ error: "Missing XTree parameters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let params: any;
    try {
      params = JSON.parse(String(paramsRaw));
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid params JSON" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    /* -------------------- job directory -------------------- */
    const runId = randomUUID();
    const jobDir = path.join(process.cwd(), "jobs", runId);
    const inputDir = path.join(jobDir, "input");
    const outputDir = path.join(jobDir, "output");

    await mkdir(inputDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });

    /* -------------------- persist files -------------------- */
    const safeSeqName = sanitizeFilename(file.name);
    const seqPath = path.join(inputDir, safeSeqName);
    await writeFile(seqPath, buffer);

    let mapPath: string | undefined;
    if (mapBuffer && mapFilename) {
      mapPath = path.join(inputDir, mapFilename);
      await writeFile(mapPath, mapBuffer);
    }

    /* -------------------- SSE stream -------------------- */
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const startTime = Date.now();
        try {
          controller.enqueue(
            encoder.encode(sseEvent("status", { status: "running" }))
          );

          await spawnXTree({
            seqPath,
            params,
            mapPath,
            onStdout(line: string) {
              controller.enqueue(
                encoder.encode(sseEvent("stdout", { line }))
              );
            },
            onStderr(line: string) {
              controller.enqueue(
                encoder.encode(sseEvent("stderr", { line }))
              );
            },
          });

          const elapsed = Date.now() - startTime;
          const outputFiles = await discoverOutputFiles(outputDir);

          /* Record successful usage */
          if (sessionUser) {
            recordUsageEvent({
              userId: sessionUser.id,
              tool: "xtree",
              stage: "run",
              status: "completed",
              durationMs: elapsed,
              metadata: { runId },
            });
          }

          controller.enqueue(
            encoder.encode(
              sseEvent("status", { status: "success", outputFiles })
            )
          );
        } catch (err: any) {
          /* Record failed usage */
          if (sessionUser) {
            const elapsed = Date.now() - startTime;
            recordUsageEvent({
              userId: sessionUser.id,
              tool: "xtree",
              stage: "run",
              status: "failed",
              durationMs: elapsed,
              metadata: { runId, error: err?.message },
            });
          }
          controller.enqueue(
            encoder.encode(
              sseEvent("status", {
                status: "error",
                error: err?.message ?? "XTree execution failed",
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
      JSON.stringify({ error: err?.message ?? "XTree run failed" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}
