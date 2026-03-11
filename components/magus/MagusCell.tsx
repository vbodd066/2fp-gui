/* ============================================================
 * MagusCell — single pipeline stage cell (Jupyter-style)
 * ============================================================
 * Renders one MAGUS pipeline stage as an interactive cell:
 *  - Collapsible config panel (existing workflowStages/*.tsx)
 *  - Run / Re-run button
 *  - Status badge with elapsed time
 *  - Live stdout/stderr output (CellOutput)
 *  - Dependency warnings (non-blocking)
 *
 * PRD §6.2 — visual design for each cell.
 * PRD §6.3 — cell state machine.
 * PRD §6.6 — MagusCell component responsibility.
 * PRD §6.8 — dependency warnings shown but not blocking.
 *
 * Props received from MagusNotebook (parent):
 *  - cell state (MagusCellState)
 *  - onRun / onConfigChange callbacks
 *  - dependency warnings for this stage
 *  - cell index for numbering
 * ============================================================ */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, RotateCcw, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import type { MagusCellState, StageKey } from "@/lib/types/magus";
import type { DependencyWarning } from "./dependencies";
import StatusBadge from "./StatusBadge";
import CellOutput from "./CellOutput";

/* -------------------- types -------------------- */

type Props = {
  /** 1-based cell index for display. */
  index: number;
  /** Cell state from MagusNotebook. */
  cell: MagusCellState;
  /** Dependency warnings for this stage. */
  warnings: DependencyWarning[];
  /** Called when user clicks Run or Re-run. */
  onRun: (stage: StageKey) => void;
  /** Called when user changes config within the stage panel. */
  onConfigChange: (stage: StageKey, config: Record<string, any>) => void;
  /** Whether any other cell is currently running (disables Run). */
  isAnotherRunning: boolean;
  /** The config panel component for this stage (injected by MagusNotebook). */
  children: React.ReactNode;
  /** File input specific to InputExecution stage. */
  file?: File | null;
  /** Setter for file input (InputExecution only). */
  setFile?: (f: File | null) => void;
};

/* -------------------- elapsed timer -------------------- */

function useElapsed(startedAt?: number, status?: string) {
  const [elapsed, setElapsed] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    if (status === "running" && startedAt) {
      const tick = () => {
        const seconds = Math.floor((Date.now() - startedAt) / 1000);
        const m = String(Math.floor(seconds / 60)).padStart(2, "0");
        const s = String(seconds % 60).padStart(2, "0");
        setElapsed(`${m}:${s}`);
      };
      tick();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      clearInterval(intervalRef.current);
      if (status !== "running") setElapsed("");
    }
    return () => clearInterval(intervalRef.current);
  }, [startedAt, status]);

  return elapsed;
}

/* -------------------- component -------------------- */

export default function MagusCell({
  index,
  cell,
  warnings,
  onRun,
  onConfigChange,
  isAnotherRunning,
  children,
}: Props) {
  const [configExpanded, setConfigExpanded] = useState(cell.status === "idle");
  const elapsed = useElapsed(cell.startedAt, cell.status);

  /** Can this cell be run right now? */
  const canRun = !isAnotherRunning && cell.status !== "running";

  /** Is this a re-run (cell has already completed or errored)? */
  const isRerun = cell.status === "success" || cell.status === "error";

  /* ---- border color based on status ---- */
  const borderClass = useMemo(() => {
    switch (cell.status) {
      case "running":
        return "border-accent/60";
      case "success":
        return "border-green-500/40";
      case "error":
        return "border-red-500/40";
      default:
        return "border-secondary/20";
    }
  }, [cell.status]);

  return (
    <div className={`rounded-lg border ${borderClass} transition-colors duration-300`}>
      {/* ---- cell header ---- */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          {/* collapse toggle */}
          <button
            onClick={() => setConfigExpanded(!configExpanded)}
            className="text-secondary hover:text-foreground transition"
            aria-label={configExpanded ? "Collapse config" : "Expand config"}
          >
            {configExpanded
              ? <ChevronDown size={16} />
              : <ChevronRight size={16} />}
          </button>

          {/* cell number + label */}
          <span className="font-semibold text-sm">
            [{index}] {cell.label}
          </span>

          {/* status badge */}
          <StatusBadge status={cell.status} elapsed={elapsed} />
        </div>

        {/* run / re-run button */}
        <button
          onClick={() => onRun(cell.stage)}
          disabled={!canRun}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold
                     rounded-md transition
                     bg-accent text-black
                     hover:brightness-110 hover:scale-[1.02]
                     disabled:opacity-40 disabled:cursor-not-allowed
                     disabled:hover:scale-100 disabled:hover:brightness-100"
          title={
            !canRun
              ? isAnotherRunning
                ? "Another stage is running"
                : "Stage is running"
              : isRerun
              ? "Re-run this stage"
              : "Run this stage"
          }
        >
          {isRerun ? (
            <>
              <RotateCcw size={14} /> Re-run
            </>
          ) : (
            <>
              <Play size={14} /> Run
            </>
          )}
        </button>
      </div>

      {/* ---- dependency warnings ---- */}
      {warnings.length > 0 && (
        <div className="mx-5 mb-2 flex items-start gap-2 rounded border
                        border-yellow-500/30 bg-yellow-500/5 p-2 text-xs text-yellow-400">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <div>
            {warnings.map((w, i) => (
              <p key={i}>{w.message}</p>
            ))}
          </div>
        </div>
      )}

      {/* ---- config panel (collapsible) ---- */}
      {configExpanded && (
        <div className="px-5 pb-4 border-t border-secondary/10 pt-4">
          {children}
        </div>
      )}

      {/* ---- output panel ---- */}
      <div className="px-5 pb-4">
        <CellOutput
          stdout={cell.stdout}
          stderr={cell.stderr}
          outputFiles={cell.outputFiles}
          status={cell.status}
          error={cell.error}
        />
      </div>
    </div>
  );
}
