import { spawn } from "child_process";
import path from "path";
import { MAGUS_TIMEOUT } from "@/lib/uploads/limits";

export function runMAGUS(inputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const magusPath = path.join(
      process.cwd(),
      "scripts",
      "magus",
      "2FP_MAGUS",
      "magus.sh" // or main executable
    );

    const proc = spawn(magusPath, [
      "--input",
      inputPath,
      "--preset",
      "eukaryote-dominant",
    ]);

    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error("MAGUS execution timed out"));
    }, MAGUS_TIMEOUT);

    proc.stdout.on("data", (d) => {
      stdout += d.toString();
    });

    proc.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        reject(new Error(stderr || "MAGUS execution failed"));
      } else {
        resolve(stdout);
      }
    });
  });
}
