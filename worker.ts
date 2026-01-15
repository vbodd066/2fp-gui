import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs/promises";
import { sendEmail } from "./lib/email/sendEmail";
import { renderTemplate } from "./lib/email/renderTemplate";

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
      const metaPath = path.join(jobDir, "meta.json");
      const metaRaw = await fs.readFile(metaPath, "utf8");
      const meta = JSON.parse(metaRaw);

      if (!meta.createdAt) continue;

      if (now - meta.createdAt > JOB_RETENTION_MS) {
        await fs.rm(jobDir, { recursive: true, force: true });
        console.log(`🧹 Cleaned up expired job ${jobId}`);
      }
    } catch {
      // Skip malformed jobs safely
      continue;
    }
  }
}

async function runWorker() {
  console.log(
    `Worker started (${USE_EXECUTION_STUBS ? "STUB MODE" : "REAL EXECUTION"})`
  );

  // ---- Dynamic imports (TS + ESM safe) ----
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

  // ---- Worker loop ----
  while (true) {
    const now = Date.now();

    // ---- Periodic cleanup ----
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
      // ---- Load metadata ----
      meta = JSON.parse(
        await fs.readFile(path.join(jobDir, "meta.json"), "utf8")
      );

      const params = JSON.parse(
        await fs.readFile(path.join(jobDir, "params.json"), "utf8")
      );

      // ---- Mark job running ----
      await fs.writeFile(
        path.join(jobDir, "status.json"),
        JSON.stringify(
          { status: "running", startedAt: Date.now() },
          null,
          2
        )
      );

      // ---- Find input file ----
      const files = await fs.readdir(jobDir);
      const inputFile = files.find(
        f =>
          !["meta.json", "params.json", "status.json", "stdout.log"].includes(f)
      );

      if (!inputFile) {
        throw new Error("Input file not found");
      }

      const inputPath = path.join(jobDir, inputFile);

      // ---- Execute tool ----
      let stdout: string;

      if (meta.tool === "xtree") {
        stdout = await runXTree(inputPath, params);
      } else if (meta.tool === "magus") {
        stdout = await runMAGUS(inputPath, params);
      } else {
        throw new Error(`Unknown tool: ${meta.tool}`);
      }

      // ---- Persist output ----
      await fs.writeFile(path.join(jobDir, "stdout.log"), stdout);

      await fs.writeFile(
        path.join(jobDir, "status.json"),
        JSON.stringify(
          { status: "done", finishedAt: Date.now() },
          null,
          2
        )
      );

      console.log(`Job ${jobId} completed successfully`);

      // ---- Send success email (template-based) ----
      try {
        const templateName =
          meta.tool === "xtree"
            ? "xtree-success.txt"
            : "magus-success.txt";

        const body = await renderTemplate(templateName, {
          jobId: meta.id,
          submittedAt: new Date(meta.createdAt).toLocaleString(),
          completedAt: new Date().toLocaleString(),
        });

        await sendEmail({
          to: meta.email,
          subject: `[2FP] ${meta.tool.toUpperCase()} job completed`,
          text: body,
        });
      } catch (emailErr) {
        console.error(
          `Failed to send completion email for job ${jobId}:`,
          emailErr
        );
      }
    } catch (err: any) {
      // ---- Persist failure ----
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

      // ---- Send failure email (template-based) ----
      if (meta?.email) {
        try {
          const templateName =
            meta.tool === "xtree"
              ? "xtree-failure.txt"
              : "magus-failure.txt";

          const body = await renderTemplate(templateName, {
            jobId: meta.id,
            error: err?.message ?? "Unknown error",
          });

          await sendEmail({
            to: meta.email,
            subject: `[2FP] ${meta.tool.toUpperCase()} job failed`,
            text: body,
          });
        } catch (emailErr) {
          console.error(
            `Failed to send failure email for job ${jobId}:`,
            emailErr
          );
        }
      }
    }
  }
}

// ---- Start worker ----
runWorker().catch(err => {
  console.error("Worker crashed:", err);
  process.exit(1);
});
