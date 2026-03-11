/* ============================================================
 * XTree stub executor — simulates streaming for dev/testing
 * ============================================================ */

import { buildXTreeCommand, type XTreeParams } from "@/lib/xtree/buildCommand";
import type { SpawnXTreeOptions } from "@/lib/execution/runXTree";

/**
 * Drop-in replacement for `spawnXTree` that simulates output
 * line-by-line without actually running XTree.
 */
export async function spawnXTreeStub(
  opts: Omit<SpawnXTreeOptions, "signal">
): Promise<void> {
  const { seqPath, params, mapPath, onStdout, onStderr } = opts;

  const { command } = buildXTreeCommand({
    xtreePath: "xtree",
    seqPath,
    params,
    mapPath,
  });

  const lines = [
    "[stub] XTree execution",
    "",
    `[stub] Command: ${command}`,
    `[stub] Mode: ${params.mode}`,
    "",
    "[stub] Processing…",
  ];

  for (const line of lines) {
    onStdout(line);
    await new Promise((res) => setTimeout(res, 200));
  }

  onStderr("[stub] (no real execution performed)");
  await new Promise((res) => setTimeout(res, 300));
  onStdout("[stub] XTree complete.");
}
