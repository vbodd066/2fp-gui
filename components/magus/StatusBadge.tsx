/* ============================================================
 * StatusBadge — visual indicator for cell execution state
 * ============================================================
 * Maps CellStatus → colored badge with icon/text.
 * PRD §6.3 — idle/running/success/error visual indicators.
 * ============================================================ */

"use client";

import type { CellStatus } from "@/lib/types/magus";

type Props = {
  status: CellStatus;
  /** Elapsed time string shown during "running" state. */
  elapsed?: string;
};

export default function StatusBadge({ status, elapsed }: Props) {
  switch (status) {
    case "idle":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-secondary">
          <span className="w-2 h-2 rounded-full bg-secondary/40" />
          Idle
        </span>
      );
    case "running":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-accent">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          Running{elapsed ? ` (${elapsed})` : "…"}
        </span>
      );
    case "success":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          Complete
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-red-400">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          Error
        </span>
      );
  }
}
