import { spawn } from "child_process";
import path from "path";

import { compileWorkflow } from "@/lib/magus/compileWorkflow";
import { buildCommand } from "@/lib/magus/buildCommand";

/**
 * Execute a compiled MAGUS workflow sequentially.
 * This function is intentionally side-effectful and boring.
 */
export async function runMAGUS(
  inputPath: string,
  params: { stages: any }
): Promise<string> {
  const magusBinary = path.join(
    process.cwd(),
    "scripts/magus/2FP_MAGUS/magus"
  );

  const workflow = compileWorkflow(params);

  if (workflow.length === 0) {
    throw new Error("No MAGUS workflow steps enabled");
  }

  let combinedStdout = "";

  for (const step of workflow) {
    const argv = buildCommand(step);

    // Replace "magus" with absolute binary path
    argv[0] = magusBinary;

    combinedStdout += `\n# >>> ${argv.join(" ")}\n`;

    await new Promise<void>((resolve, reject) => {
      const proc = spawn(argv[0], argv.slice(1), {
        stdio: ["ignore", "pipe", "pipe"],
      });

      proc.stdout.on("data", d => {
        combinedStdout += d.toString();
      });

      proc.stderr.on("data", d => {
        combinedStdout += d.toString();
      });

      proc.on("error", err => {
        reject(err);
      });

      proc.on("close", code => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `MAGUS step "${step.id}" failed with exit code ${code}`
            )
          );
        }
      });
    });
  }

  return combinedStdout;
}
