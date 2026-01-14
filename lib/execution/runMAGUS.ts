import { spawn } from "child_process";
import path from "path";

export function runMAGUS(
  inputPath: string,
  params: { preset: string; minContig: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const magus = path.join(process.cwd(), "scripts/magus/2FP_MAGUS/magus");

    const args = [
      "--input", inputPath,
      "--preset", params.preset,
      "--min-contig", String(params.minContig),
    ];

    const proc = spawn(magus, args);
    let out = "", err = "";

    proc.stdout.on("data", d => out += d);
    proc.stderr.on("data", d => err += d);

    proc.on("close", code => {
      code === 0 ? resolve(out) : reject(new Error(err));
    });
  });
}
