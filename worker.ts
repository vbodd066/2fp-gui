import "dotenv/config";
import fs from "fs/promises";
import path from "path";

const USE_EXECUTION_STUBS = process.env.USE_EXECUTION_STUBS === "true";

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runWorker() {
  console.log(
    `Worker started (${USE_EXECUTION_STUBS ? "STUB MODE" : "REAL EXECUTION"})`
  );

  // ---- Dynamic imports INSIDE async function ----
  const { dequeueJob } = await import("./lib/queue/index");

  const xtreeModule = USE_EXECUTION_STUBS
    ? await import("./lib/execution/stubs/runXtreeStub")
    : await import("./lib/execution/runXTree");

  const magusModule = USE_EXECUTION_STUBS
    ? await import("./lib/execution/stubs/runMAGUSStub")
    : await import("./lib/execution/runMAGUS");

  const runXTree = xtreeModule.runXTree;
  const runMAGUS = magusModule.runMAGUS;

  // ---- Worker loop ----
  while (true) {
    const jobId = await dequeueJob();

    if (!jobId) {
      await sleep(2000);
      continue;
    }

    const jobDir = path.join(process.cwd(), "jobs", jobId);

    try {
      const meta = JSON.parse(
        await fs.readFile(path.join(jobDir, "meta.json"), "utf8")
      );

      const params = JSON.parse(
        await fs.readFile(path.join(jobDir, "params.json"), "utf8")
      );

      await fs.writeFile(
        path.join(jobDir, "status.json"),
        JSON.stringify({ status: "running", startedAt: Date.now() }, null, 2)
      );

      const files = await fs.readdir(jobDir);
      const inputFile = files.find(
        f => !["meta.json", "params.json", "status.json"].includes(f)
      );

      if (!inputFile) {
        throw new Error("Input file not found");
      }

      const inputPath = path.join(jobDir, inputFile);

      let stdout: string;

      if (meta.tool === "xtree") {
        stdout = await runXTree(inputPath, params);
      } else if (meta.tool === "magus") {
        stdout = await runMAGUS(inputPath, params);
      } else {
        throw new Error(`Unknown tool: ${meta.tool}`);
      }

      await fs.writeFile(path.join(jobDir, "stdout.log"), stdout);

      await fs.writeFile(
        path.join(jobDir, "status.json"),
        JSON.stringify({ status: "done", finishedAt: Date.now() }, null, 2)
      );

      console.log(`Job ${jobId} completed successfully`);
    } catch (err: any) {
      await fs.writeFile(
        path.join(jobDir, "status.json"),
        JSON.stringify(
          {
            status: "error",
            error: err.message ?? "Unknown error",
            finishedAt: Date.now(),
          },
          null,
          2
        )
      );

      console.error(`Job ${jobId} failed:`, err.message);
    }
  }
}

// ---- Start worker ----
runWorker().catch(err => {
  console.error("Worker crashed:", err);
  process.exit(1);
});
