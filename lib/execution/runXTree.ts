import { spawn } from "child_process";
import path from "path";

export function runXTree(
  inputPath: string,
  params: { db: string; readType: string; sensitivity: string }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xtree = path.join(process.cwd(), "scripts/xtree/2FP-XTree/xtree");

    const args = ["--input", inputPath, "--db", params.db];

    if (params.readType === "long") args.push("--long-reads");
    if (params.sensitivity === "high") args.push("--high-sensitivity");

    const proc = spawn(xtree, args);
    let out = "", err = "";

    proc.stdout.on("data", d => out += d);
    proc.stderr.on("data", d => err += d);

    proc.on("close", code => {
      code === 0 ? resolve(out) : reject(new Error(err));
    });
  });
}
