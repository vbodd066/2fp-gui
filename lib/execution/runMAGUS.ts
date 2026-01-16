import { spawn } from "child_process";
import path from "path";
import type { WorkflowStep } from "@/lib/magus/compileWorkflow";
import { buildCommand } from "@/lib/magus/buildCommand";

type RunMAGUSArgs = {
  jobDir: string;
  inputPath: string;
  steps: WorkflowStep[];
};

export async function runMAGUS({
  jobDir,
  inputPath,
  steps,
}: RunMAGUSArgs): Promise<string> {
  let combinedOutput = "";

  for (const step of steps) {
    const argv = buildCommand(step);

    const magusBin = path.join(
      process.cwd(),
      "scripts/magus/2FP_MAGUS/magus"
    );

    const proc = spawn(magusBin, argv.slice(1), {
      cwd: jobDir,
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", d => (stdout += d.toString()));
    proc.stderr.on("data", d => (stderr += d.toString()));

    const exitCode: number = await new Promise(resolve =>
      proc.on("close", resolve)
    );

    combinedOutput +=
      `\n# STEP: ${step.id}\n` +
      stdout +
      (stderr ? `\n[stderr]\n${stderr}\n` : "");

    if (exitCode !== 0) {
      throw new Error(
        `MAGUS step failed: ${step.id}\n${stderr || stdout}`
      );
    }
  }

  return combinedOutput;
}
