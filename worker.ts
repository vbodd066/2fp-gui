import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { compileWorkflow } from "./lib/magus/compileWorkflow";
import { buildCommand } from "./lib/magus/buildCommand";
import fs from "fs/promises";
import { sendEmail } from "./lib/email/sendEmail";
import { renderTemplate } from "./lib/email/renderTemplate";
import { buildXTreeCommand } from "./lib/xtree/buildCommand";

// ---- Job cleanup configuration ----
const JOB_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;  // 30 minutes

const USE_EXECUTION_STUBS = process.env.USE_EXECUTION_STUBS === "true";

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Deletes job directories older than JOB_RETENTION_MS.
 * Safe: only deletes jobs with valid meta.json + createdAt.
 */
async function cleanupOldJobs() {
  const jobsRoot = path.join(process.cwd(), "jobs");

  let entries: string[];
  try {
    entries = await fs.readdir(jobsRoot);
  } catch {
    return;
  }

  const now = Date.now();

  for (const jobId of entries) {
    const jobDir = path.join(jobsRoot, jobId);

    try {
      const meta = JSON.parse(
        await fs.readFile(path.join(jobDir, "meta.json"), "utf8")
      );

      if (!meta.createdAt) continue;

      if (now - meta.createdAt > JOB_RETENTION_MS) {
        await fs.rm(jobDir, { recursive: true, force: true });
        console.log(`🧹 Cleaned up expired job ${jobId}`);
      }
    } catch {
      continue;
    }
  }
}

async function runWorker() {
  console.log(
    `Worker started (${USE_EXECUTION_STUBS ? "STUB MODE" : "REAL EXECUTION"})`
  );

  const { dequeueJob } = await import("./lib/queue/index");

  const xtreeModule = USE_EXECUTION_STUBS
    ? await import("./lib/execution/stubs/runXtreeStub")
    : await import("./lib/execution/runXTree");

  const magusModule = USE_EXECUTION_STUBS
    ? await import("./lib/execution/stubs/runMAGUSStub")
    : await import("./lib/execution/runMAGUS");

  const runXTree = xtreeModule.runXTree;
  const runMAGUS = magusModule.runMAGUS;

  let lastCleanup = 0;

  while (true) {
    const now = Date.now();

    if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
      try {
        await cleanupOldJobs();
      } catch (err) {
        console.error("Cleanup failed:", err);
      }
      lastCleanup = now;
    }

    const jobId = await dequeueJob();
    if (!jobId) {
      await sleep(2000);
      continue;
    }

    const jobDir = path.join(process.cwd(), "jobs", jobId);
    let meta: any;

    try {
      /* -------------------- load metadata -------------------- */
      meta = JSON.parse(
        await fs.readFile(path.join(jobDir, "meta.json"), "utf8")
      );

      const params = JSON.parse(
        await fs.readFile(path.join(jobDir, "params.json"), "utf8")
      );

      await fs.writeFile(
        path.join(jobDir, "status.json"),
        JSON.stringify({ status: "running", startedAt: Date.now() }, null, 2)
      );

      /* -------------------- locate inputs -------------------- */
      const inputDir = path.join(jobDir, "input");
      const inputFiles = await fs.readdir(inputDir);

      const seqFile = inputFiles.find(f => !f.toLowerCase().includes("map"));
      const mapFile = inputFiles.find(f => f.toLowerCase().includes("map"));

      if (!seqFile) {
        throw new Error("Sequence file not found");
      }

      const seqPath = path.join(inputDir, seqFile);
      const mapPath = mapFile ? path.join(inputDir, mapFile) : undefined;

      /* -------------------- command provenance -------------------- */
      if (meta.tool === "xtree") {
        const { command } = buildXTreeCommand({
          xtreePath: "xtree",
          seqPath,
          params,
          mapPath,
        });

        await fs.writeFile(
          path.join(jobDir, "command.txt"),
          command
        );
      }

      if (meta.tool === "magus") {
        const workflowSteps = compileWorkflow(params);

        const argvList = workflowSteps.map(step =>
          buildCommand(step)
        );

        const commandText =
          argvList.length === 0
            ? "# No MAGUS steps enabled"
            : argvList.map(argv => argv.join(" ")).join("\n");

        await fs.writeFile(
          path.join(jobDir, "command.txt"),
          commandText
        );
      }

      /* -------------------- execute -------------------- */
      let stdout: string;

      if (meta.tool === "xtree") {
        stdout = await runXTree(seqPath, params, mapPath);
      } else if (meta.tool === "magus") {
        const steps = compileWorkflow(params);

        stdout = await runMAGUS({
          jobDir,
          inputPath: seqPath,
          steps,
        });
      } else {
        throw new Error(`Unknown tool: ${meta.tool}`);
      }

      await fs.writeFile(path.join(jobDir, "stdout.log"), stdout);

      await fs.writeFile(
        path.join(jobDir, "status.json"),
        JSON.stringify({ status: "done", finishedAt: Date.now() }, null, 2)
      );

      /* -------------------- success email -------------------- */
      try {
        if (meta.tool === "xtree") {
          const command = await fs.readFile(
            path.join(jobDir, "command.txt"),
            "utf8"
          );

          const body = await renderTemplate("xtree-success.txt", {
            jobId: meta.id,
            mode: meta.mode,
            submittedAt: new Date(meta.createdAt).toLocaleString(),
            completedAt: new Date().toLocaleString(),
            command,
          });

          await sendEmail({
            to: meta.email,
            subject: "[2FP] XTree job completed",
            text: body,
          });
        }

        if (meta.tool === "magus") {
          const stepsDir = path.join(jobDir, "steps");
          const stepIds = await fs.readdir(stepsDir);

          const commands = await Promise.all(
            stepIds.map(step =>
              fs.readFile(
                path.join(stepsDir, step, "command.txt"),
                "utf8"
              )
            )
          );

          const body = await renderTemplate("magus-success.txt", {
            jobId: meta.id,
            submittedAt: new Date(meta.createdAt).toLocaleString(),
            completedAt: new Date().toLocaleString(),
            steps: stepIds.map(s => `- ${s}`).join("\n"),
            commands: commands.join("\n"),
          });

          await sendEmail({
            to: meta.email,
            subject: "[2FP] MAGUS workflow completed",
            text: body,
          });
        }
      } catch (emailErr) {
        console.error("Failed to send success email:", emailErr);
      }

    } catch (err: any) {
      /* -------------------- failure handling -------------------- */
      await fs.writeFile(
        path.join(jobDir, "status.json"),
        JSON.stringify(
          {
            status: "error",
            error: err?.message ?? "Unknown error",
            finishedAt: Date.now(),
          },
          null,
          2
        )
      );

      console.error(`Job ${jobId} failed:`, err?.message);

      if (meta?.email) {
        try {
          if (meta.tool === "xtree") {
            let command = "(command not available)";
            try {
              command = await fs.readFile(
                path.join(jobDir, "command.txt"),
                "utf8"
              );
            } catch {}

            const body = await renderTemplate("xtree-failure.txt", {
              jobId: meta.id,
              mode: meta.mode,
              error: err?.message ?? "Unknown error",
              command,
            });

            await sendEmail({
              to: meta.email,
              subject: "[2FP] XTree job failed",
              text: body,
            });
          }

          if (meta.tool === "magus") {
            let commands = "(no commands executed)";
            let failedStep = "(unknown)";

            try {
              const stepsDir = path.join(jobDir, "steps");
              const stepIds = await fs.readdir(stepsDir);

              for (const step of stepIds) {
                const status = JSON.parse(
                  await fs.readFile(
                    path.join(stepsDir, step, "status.json"),
                    "utf8"
                  )
                );

                if (status.status === "error") {
                  failedStep = step;
                  break;
                }
              }

              const completedCommands = await Promise.all(
                stepIds.map(step =>
                  fs.readFile(
                    path.join(stepsDir, step, "command.txt"),
                    "utf8"
                  )
                )
              );

              commands = completedCommands.join("\n");
            } catch {}

            const body = await renderTemplate("magus-failure.txt", {
              jobId: meta.id,
              failedStep,
              error: err?.message ?? "Unknown error",
              commands,
            });

            await sendEmail({
              to: meta.email,
              subject: "[2FP] MAGUS workflow failed",
              text: body,
            });
          }
        } catch (emailErr) {
          console.error("Failed to send failure email:", emailErr);
        }
      }
    }
  }
}

runWorker().catch(err => {
  console.error("Worker crashed:", err);
  process.exit(1);
});
