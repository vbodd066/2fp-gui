/* ============================================================
 * XTree executor — streaming child process
 * ============================================================
 * PRD §5.4 — spawn XTree as a child process, streaming
 * stdout/stderr line-by-line to the caller via callbacks.
 *
 * Replaces the old promise-based runXTree that collected all
 * output into a single string.
 * ============================================================ */

import { spawn } from "child_process";
import path from "path";
import { buildXTreeCommand, type XTreeParams } from "@/lib/xtree/buildCommand";

/* -------------------- types -------------------- */

export type SpawnXTreeOptions = {
  /** Absolute path to the input sequence file. */
  seqPath: string;
  /** XTree parameters. */
  params: XTreeParams;
  /** Optional map file path (BUILD mode). */
  mapPath?: string;
  /** Called for each stdout line. */
  onStdout: (line: string) => void;
  /** Called for each stderr line. */
  onStderr: (line: string) => void;
  /** Optional AbortSignal to cancel the process. */
  signal?: AbortSignal;
};

/* -------------------- public API -------------------- */

/**
 * Execute XTree in a child process and stream output
 * line-by-line via callbacks.
 *
 * Resolves when the process exits with code 0.
 * Rejects on non-zero exit or spawn error.
 */
export function spawnXTree(opts: SpawnXTreeOptions): Promise<void> {
  const { seqPath, params, mapPath, onStdout, onStderr, signal } = opts;

  return new Promise((resolve, reject) => {
    const xtreePath = path.join(
      process.cwd(),
      "scripts",
      "xtree",
      "2FP-XTree",
      "xtree"
    );

    const { argv } = buildXTreeCommand({
      xtreePath,
      seqPath,
      params,
      mapPath,
    });

    const proc = spawn(argv[0], argv.slice(1), {
      stdio: ["ignore", "pipe", "pipe"],
    });

    /* ---- abort support ---- */
    if (signal) {
      const onAbort = () => {
        proc.kill("SIGTERM");
        reject(new Error("XTree execution aborted"));
      };
      signal.addEventListener("abort", onAbort, { once: true });
      proc.on("close", () =>
        signal.removeEventListener("abort", onAbort)
      );
    }

    /* ---- stream stdout line-by-line ---- */
    let stdoutBuffer = "";
    proc.stdout!.on("data", (chunk: Buffer) => {
      stdoutBuffer += chunk.toString();
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() ?? "";
      for (const line of lines) {
        onStdout(line);
      }
    });

    /* ---- stream stderr line-by-line ---- */
    let stderrBuffer = "";
    proc.stderr!.on("data", (chunk: Buffer) => {
      stderrBuffer += chunk.toString();
      const lines = stderrBuffer.split("\n");
      stderrBuffer = lines.pop() ?? "";
      for (const line of lines) {
        onStderr(line);
      }
    });

    /* ---- process exit ---- */
    proc.on("close", (code) => {
      if (stdoutBuffer) onStdout(stdoutBuffer);
      if (stderrBuffer) onStderr(stderrBuffer);

      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(`XTree exited with code ${code}`)
        );
      }
    });

    proc.on("error", (err) => {
      reject(
        new Error(`Failed to spawn XTree: ${err.message}`)
      );
    });
  });
}
