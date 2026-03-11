/* ============================================================
 * CellToolbar — global actions for MAGUS notebook
 * ============================================================
 * Renders "Run All", "Run From Selected", and "Reset All"
 * at the bottom of the notebook.
 *
 * PRD §6.2 — bottom toolbar in visual design.
 * PRD §6.6 — CellToolbar component responsibility.
 * ============================================================ */

"use client";

import { PlayCircle, FastForward, RotateCcw } from "lucide-react";

type Props = {
  /** Run all stages sequentially from the first. */
  onRunAll: () => void;
  /** Run all stages from a specific stage onward. */
  onRunFromSelected: () => void;
  /** Reset all cells to idle state. */
  onResetAll: () => void;
  /** True if any cell is currently running. */
  isRunning: boolean;
};

export default function CellToolbar({
  onRunAll,
  onRunFromSelected,
  onResetAll,
  isRunning,
}: Props) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-secondary/20
                    bg-black/20 px-5 py-3">
      {/* Run All */}
      <button
        onClick={onRunAll}
        disabled={isRunning}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold
                   rounded-md transition
                   bg-accent text-black
                   hover:brightness-110 hover:scale-[1.02]
                   disabled:opacity-40 disabled:cursor-not-allowed
                   disabled:hover:scale-100"
      >
        <PlayCircle size={16} />
        Run All
      </button>

      {/* Run From Selected */}
      <button
        onClick={onRunFromSelected}
        disabled={isRunning}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold
                   rounded-md transition
                   border border-accent text-accent
                   hover:bg-accent/10 hover:scale-[1.02]
                   disabled:opacity-40 disabled:cursor-not-allowed
                   disabled:hover:scale-100"
      >
        <FastForward size={16} />
        Run From Selected
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Reset All */}
      <button
        onClick={onResetAll}
        disabled={isRunning}
        className="flex items-center gap-1.5 px-4 py-2 text-sm
                   rounded-md transition
                   text-secondary border border-secondary/30
                   hover:text-foreground hover:border-secondary/60
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <RotateCcw size={14} />
        Reset All
      </button>
    </div>
  );
}
