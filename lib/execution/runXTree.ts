import { spawn } from "child_process";
import path from "path";

export function runXTree(inputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const xtreePath = path.join(
      process.cwd(),
      "scripts",
      "xtree",
      "2FP-XTree",
      "xtree.sh" // or binary
    );

    const proc = spawn(xtreePath, [
      "--input",
      inputPath,
      "--db",
      "gtdb",
    ]);

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || "XTree execution failed"));
      } else {
        resolve(stdout);
      }
    });
  });
}
