import { spawn } from "child_process";
import path from "path";
import { buildXTreeCommand, XTreeParams } from "@/lib/xtree/buildCommand";

export function runXTree(
  seqPath: string,
  params: XTreeParams,
  mapPath?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xtreePath = path.join(
      process.cwd(),
      "scripts/xtree/2FP-XTree/xtree"
    );

    const { argv } = buildXTreeCommand({
      xtreePath,
      seqPath,
      params,
      mapPath,
    });

    const proc = spawn(argv[0], argv.slice(1));

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", d => {
      stdout += d.toString();
    });

    proc.stderr.on("data", d => {
      stderr += d.toString();
    });

    proc.on("close", code => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(
          new Error(
            stderr || `xtree exited with non-zero status: ${code}`
          )
        );
      }
    });
  });
}
