/* ============================================================
 * POST /api/magus/run-all — Execute all MAGUS stages via SSE
 * ============================================================
 * PRD §6.5 — "POST /api/magus/run-all { stages: { ... } }"
 *
 * Runs stages sequentially, streaming per-stage events:
 *   event: stage-start    → { stage }
 *   event: stdout         → { stage, line }
 *   event: stderr         → { stage, line }
 *   event: stage-complete → { stage, status, outputFiles?, error? }
 * ============================================================ */

import { NextRequest } from "next/server";
import { mkdir, readdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

import {
  compileWorkflow,
  type StageKey,
  type WorkflowState,
} from "@/lib/magus/compileWorkflow";
import { spawnStage } from "@/lib/execution/runMAGUS";
import { validateSession, SESSION_COOKIE } from "@/lib/db/sessions";
import { recordUsageEvent } from "@/lib/db/usage";

/* ---- helpers ---- */

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function discoverOutputFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isFile()).map((e) => e.name);
  } catch {
    return [];
  }
}

/* ---- stage ordering ---- */

const STAGE_ORDER: StageKey[] = [
  "input",
  "preprocessing",
  "assembly",
  "taxonomy",
  "specialized",
  "annotation",
  "phylogeny",
];

/* ---- route ---- */

export async function POST(req: NextRequest) {
  try {
    /* ---- identify user for usage tracking ---- */
    const sessionToken = req.cookies.get(SESSION_COOKIE)?.value;
    const sessionUser = sessionToken ? validateSession(sessionToken) : null;

    const body = await req.json();
    const stagesInput: Record<
      StageKey,
      { config: Record<string, any> }
    > = body.stages;

    if (!stagesInput || typeof stagesInput !== "object") {
      return new Response(
        JSON.stringify({ error: "Missing 'stages' field" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    /* ---- job directory ---- */
    const runId = randomUUID();
    const jobDir = path.join(process.cwd(), "jobs", runId);
    await mkdir(jobDir, { recursive: true });

    /* ---- build workflow state ---- */
    const workflowState: WorkflowState = {
      stages: {} as Record<StageKey, { enabled: boolean; config: any }>,
    };

    for (const key of STAGE_ORDER) {
      workflowState.stages[key] = {
        enabled: key in stagesInput,
        config: stagesInput[key]?.config ?? {},
      };
    }

    /* ---- SSE stream ---- */
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        for (const stageKey of STAGE_ORDER) {
          if (!(stageKey in stagesInput)) continue;
          if (stageKey === "input") continue; // input stage has no execution

          const outputDir = path.join(jobDir, "output", stageKey);
          await mkdir(outputDir, { recursive: true });

          /* compile steps for this stage only */
          const singleStageState: WorkflowState = {
            stages: {} as Record<StageKey, { enabled: boolean; config: any }>,
          };
          for (const k of STAGE_ORDER) {
            singleStageState.stages[k] = {
              enabled: k === stageKey,
              config:
                k === stageKey
                  ? stagesInput[stageKey].config
                  : {},
            };
          }
          const steps = compileWorkflow(singleStageState);

          controller.enqueue(
            encoder.encode(
              sseEvent("stage-start", { stage: stageKey })
            )
          );

          try {
            for (const step of steps) {
              const stepStart = Date.now();
              await spawnStage({
                jobDir,
                step,
                onStdout(line: string) {
                  controller.enqueue(
                    encoder.encode(
                      sseEvent("stdout", { stage: stageKey, line })
                    )
                  );
                },
                onStderr(line: string) {
                  controller.enqueue(
                    encoder.encode(
                      sseEvent("stderr", { stage: stageKey, line })
                    )
                  );
                },
              });

              /* Record usage for this step */
              if (sessionUser) {
                const elapsed = Date.now() - stepStart;
                recordUsageEvent({
                  userId: sessionUser.id,
                  tool: "magus",
                  stage: step.id ?? stageKey,
                  status: "completed",
                  durationMs: elapsed,
                  metadata: { runId, step: step.id },
                });
              }
            }

            const outputFiles = await discoverOutputFiles(outputDir);

            controller.enqueue(
              encoder.encode(
                sseEvent("stage-complete", {
                  stage: stageKey,
                  status: "success",
                  outputFiles,
                })
              )
            );
          } catch (err: any) {
            /* Record failed usage */
            if (sessionUser) {
              recordUsageEvent({
                userId: sessionUser.id,
                tool: "magus",
                stage: stageKey,
                status: "failed",
                durationMs: 0,
                metadata: { runId, error: err?.message },
              });
            }
            controller.enqueue(
              encoder.encode(
                sseEvent("stage-complete", {
                  stage: stageKey,
                  status: "error",
                  error: err?.message ?? "Stage execution failed",
                })
              )
            );
            /* Stop run-all on first error */
            break;
          }
        }

        controller.close();
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
      JSON.stringify({ error: err?.message ?? "MAGUS run-all failed" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}
