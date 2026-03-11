/* ============================================================
 * MAGUS stub executor — simulates streaming for dev/testing
 * ============================================================ */

import type { WorkflowStep } from "@/lib/magus/compileWorkflow";
import { buildCommand } from "@/lib/magus/buildCommand";
import type { SpawnStageOptions } from "@/lib/execution/runMAGUS";

/**
 * Drop-in replacement for `spawnStage` that simulates output
 * line-by-line without actually running MAGUS.
 */
export async function spawnStageStub(
  opts: Omit<SpawnStageOptions, "signal">
): Promise<void> {
  const { step, onStdout, onStderr } = opts;
  const argv = buildCommand(step);

  const lines = [
    `[stub] Running MAGUS step: ${step.id}`,
    `[stub] Command: ${argv.join(" ")}`,
    `[stub] Stage: ${step.stage}`,
    "",
    "[stub] Processing…",
  ];

  for (const line of lines) {
    onStdout(line);
    await new Promise((res) => setTimeout(res, 200));
  }

  onStderr("[stub] (no real execution performed)");
  await new Promise((res) => setTimeout(res, 300));
  onStdout("[stub] Step complete.");
}
