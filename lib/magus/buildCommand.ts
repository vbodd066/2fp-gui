/* ============================================================
 * MAGUS command builder
 * ============================================================
 * Converts a compiled WorkflowStep into a CLI argument vector.
 * ============================================================
 */

import type { WorkflowStep } from "./compileWorkflow";

/* -------------------- public API -------------------- */

/**
 * Build a shell-safe argv array for a MAGUS workflow step.
 */
export function buildCommand(step: WorkflowStep): string[] {
  const argv: string[] = [];

  /* -------------------- base command -------------------- */

  // step.command is e.g. "magus qc"
  const base = step.command.split(" ");
  argv.push(...base);

  /* -------------------- flags -------------------- */

  Object.entries(step.args ?? {}).forEach(([key, value]) => {
    appendArg(argv, key, value);
  });

  return argv;
}

/* -------------------- helpers -------------------- */

/**
 * Append a CLI argument based on its value type.
 */
function appendArg(
  argv: string[],
  key: string,
  value: any
) {
  if (value === undefined || value === null) return;

  const flag = toFlag(key);

  if (typeof value === "boolean") {
    if (value) argv.push(flag);
    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return;
    argv.push(flag, value.join(","));
    return;
  }

  if (typeof value === "object") {
    // Nested objects are flattened with dot notation:
    // { min: 5 } -> --min 5
    Object.entries(value).forEach(([k, v]) => {
      appendArg(argv, `${key}.${k}`, v);
    });
    return;
  }

  argv.push(flag, String(value));
}

/**
 * Convert camelCase or snake_case to CLI flag.
 * e.g. minContig -> --min-contig
 *      min_contig -> --min-contig
 */
function toFlag(key: string): string {
  return (
    "--" +
    key
      .replace(/\./g, "-")
      .replace(/_/g, "-")
      .replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
  );
}
