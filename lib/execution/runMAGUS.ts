/* ============================================================
 * MAGUS stage executor — streaming child process
 * ============================================================
 * PRD §6.5 — spawn a single MAGUS step as a child process,
 * streaming stdout/stderr line-by-line to the caller.
 *
 * Replaces the old batch runMAGUS that collected all output.
 * ============================================================ */

import { spawn } from "child_process";
import path from "path";
import type { WorkflowStep } from "@/lib/magus/compileWorkflow";
import { buildCommand } from "@/lib/magus/buildCommand";

/* -------------------- types -------------------- */

export type SpawnStageOptions = {
  /** Working directory for the child process. */
  jobDir: string;
  /** Compiled workflow step (from compileWorkflow). */
  step: WorkflowStep;
  /** Called for each stdout line. */
  onStdout: (line: string) => void;
  /** Called for each stderr line. */
  onStderr: (line: string) => void;
  /** Optional AbortSignal to cancel the process. */
  signal?: AbortSignal;
};

/* -------------------- public API -------------------- */

/**
 * Execute a single MAGUS step in a child process and stream
 * its output line-by-line via callbacks.
 *
 * Resolves when the process exits with code 0.
 * Rejects on non-zero exit or spawn error.
 */
export function spawnStage(opts: SpawnStageOptions): Promise<void> {
  const { jobDir, step, onStdout, onStderr, signal } = opts;

  return new Promise((resolve, reject) => {
    const argv = buildCommand(step);

    const magusBin = path.join(
      process.cwd(),
      "scripts",
      "magus",
      "2FP_MAGUS",
      "magus"
    );

    const proc = spawn(magusBin, argv.slice(1), {
      cwd: jobDir,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    /* ---- abort support ---- */
    if (signal) {
      const onAbort = () => {
        proc.kill("SIGTERM");
        reject(new Error("Stage execution aborted"));
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
      // Flush remaining buffer content
      if (stdoutBuffer) onStdout(stdoutBuffer);
      if (stderrBuffer) onStderr(stderrBuffer);

      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(`MAGUS step "${step.id}" exited with code ${code}`)
        );
      }
    });

    proc.on("error", (err) => {
      reject(
        new Error(`Failed to spawn MAGUS step "${step.id}": ${err.message}`)
      );
    });
  });
}
