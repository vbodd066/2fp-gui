/* ============================================================
 * MagusNotebook — top-level cell-based MAGUS workflow
 * ============================================================
 * Manages the full array of MagusCellState objects and
 * orchestrates execution via SSE streaming.
 *
 * PRD §6.6 — MagusNotebook component responsibility:
 *  - Manages array of MagusCell state
 *  - Renders cells in order with existing workflowStage panels
 *  - Handles "Run", "Run All", "Run From Here", "Reset All"
 *  - Integrates with useSSE hook for streaming
 *
 * State management strategy:
 *  - React useState for cell array (no external state lib)
 *  - useCallback for memoized handlers
 *  - useSSE hook for streaming execution
 *
 * Integration points:
 *  - POST /api/magus/run     (single stage execution)
 *  - POST /api/magus/run-all (sequential execution)
 *  - GET  /api/magus/output  (output file listing)
 * ============================================================ */

"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  STAGE_ORDER,
  STAGE_LABELS,
  type StageKey,
  type MagusCellState,
} from "@/lib/types/magus";
import {
  evaluateStageDependencies,
  type DependencyWarning,
  type WorkflowState,
} from "./dependencies";
import { useSSE } from "@/hooks/useSSE";

import MagusCell from "./MagusCell";
import CellToolbar from "./CellToolbar";

/* ---- existing workflowStage config panels ---- */
import InputExecution from "./workflowStages/InputExecution";
import Preprocessing from "./workflowStages/Preprocessing";
import AssemblyBinning from "./workflowStages/AssemblyBinning";
import TaxonomyFiltering from "./workflowStages/TaxonomyFiltering";
import SpecializedAnalyses from "./workflowStages/SpecializedAnalyses";
import AnnotationGeneCatalog from "./workflowStages/AnnotationGeneCatalog";
import PhylogenyFinal from "./workflowStages/PhylogenyFinal";

/* ============================================================
 * Initial cell state factory
 * ============================================================ */

function createInitialCells(): MagusCellState[] {
  return STAGE_ORDER.map((stage) => ({
    stage,
    label: STAGE_LABELS[stage],
    config: {},
    status: "idle" as const,
    stdout: "",
    stderr: "",
    outputFiles: [],
  }));
}

/* ============================================================
 * Component
 * ============================================================ */

export default function MagusNotebook() {
  /* ---- cell state ---- */
  const [cells, setCells] = useState<MagusCellState[]>(createInitialCells);

  /* ---- input file (used only by InputExecution stage) ---- */
  const [inputFile, setInputFile] = useState<File | null>(null);

  /* ---- selected cell for "Run From Selected" ---- */
  const [selectedStage, setSelectedStage] = useState<StageKey>("input");

  /* ---- SSE hook ---- */
  const { start, abort, isStreaming } = useSSE();

  /* ---- ref to track run-all queue ---- */
  const runAllQueueRef = useRef<StageKey[]>([]);

  /* ============================================================
   * Cell updaters
   * ============================================================ */

  /** Update a single cell by stage key. */
  const updateCell = useCallback(
    (stage: StageKey, updates: Partial<MagusCellState>) => {
      setCells((prev) =>
        prev.map((c) => (c.stage === stage ? { ...c, ...updates } : c))
      );
    },
    []
  );

  /** Append to stdout for a specific cell. */
  const appendStdout = useCallback(
    (stage: StageKey, line: string) => {
      setCells((prev) =>
        prev.map((c) =>
          c.stage === stage ? { ...c, stdout: c.stdout + line + "\n" } : c
        )
      );
    },
    []
  );

  /** Append to stderr for a specific cell. */
  const appendStderr = useCallback(
    (stage: StageKey, line: string) => {
      setCells((prev) =>
        prev.map((c) =>
          c.stage === stage ? { ...c, stderr: c.stderr + line + "\n" } : c
        )
      );
    },
    []
  );

  /* ============================================================
   * Config change handler
   * ============================================================ */

  const handleConfigChange = useCallback(
    (stage: StageKey, config: Record<string, any>) => {
      updateCell(stage, { config });
    },
    [updateCell]
  );

  /* ============================================================
   * Dependency warnings (PRD §6.8 — warnings, not blockers)
   * ============================================================ */

  /**
   * Build a pseudo-WorkflowState from cells so we can reuse
   * the existing evaluateStageDependencies function.
   * In cell mode, "enabled" maps to "has this stage completed?"
   */
  const dependencyWarnings = useMemo(() => {
    const workflowState: WorkflowState = {} as WorkflowState;
    for (const cell of cells) {
      workflowState[cell.stage] = {
        enabled: cell.status === "success",
        config: cell.config,
      };
    }
    return evaluateStageDependencies(workflowState);
  }, [cells]);

  /** Get warnings for a specific stage. */
  const warningsForStage = useCallback(
    (stage: StageKey): DependencyWarning[] =>
      dependencyWarnings.filter((w) => w.stage === stage),
    [dependencyWarnings]
  );

  /* ============================================================
   * Run a single stage via SSE
   * ============================================================ */

  const runStage = useCallback(
    (stage: StageKey) => {
      const cell = cells.find((c) => c.stage === stage);
      if (!cell) return;

      // Reset cell output and set running
      updateCell(stage, {
        status: "running",
        startedAt: Date.now(),
        finishedAt: undefined,
        stdout: "",
        stderr: "",
        outputFiles: [],
        error: undefined,
      });

      start({
        url: "/api/magus/run",
        body: { stage, config: cell.config },
        callbacks: {
          onEvent(event, data) {
            switch (event) {
              case "stdout":
                appendStdout(stage, data.line);
                break;
              case "stderr":
                appendStderr(stage, data.line);
                break;
              case "status":
                updateCell(stage, {
                  status: data.status,
                  finishedAt: Date.now(),
                  outputFiles: data.outputFiles ?? [],
                  error: data.error,
                });
                break;
            }
          },
          onDone() {
            // If there are queued stages (run-all mode), run the next one
            const next = runAllQueueRef.current.shift();
            if (next) {
              runStage(next);
            }
          },
          onError(err) {
            updateCell(stage, {
              status: "error",
              finishedAt: Date.now(),
              error: err.message,
            });
          },
        },
      });
    },
    [cells, start, updateCell, appendStdout, appendStderr]
  );

  /* ============================================================
   * Run All — sequential execution of all stages
   * ============================================================ */

  const runAll = useCallback(() => {
    // Queue all stages after the first, then run the first
    const [first, ...rest] = STAGE_ORDER;
    runAllQueueRef.current = [...rest];
    runStage(first);
  }, [runStage]);

  /* ============================================================
   * Run From Selected — run from selected stage onward
   * ============================================================ */

  const runFromSelected = useCallback(() => {
    const idx = STAGE_ORDER.indexOf(selectedStage);
    if (idx === -1) return;
    const toRun = STAGE_ORDER.slice(idx);
    const [first, ...rest] = toRun;
    runAllQueueRef.current = [...rest];
    runStage(first);
  }, [selectedStage, runStage]);

  /* ============================================================
   * Reset All
   * ============================================================ */

  const resetAll = useCallback(() => {
    abort();
    runAllQueueRef.current = [];
    setCells(createInitialCells());
    setInputFile(null);
  }, [abort]);

  /* ============================================================
   * Check if any cell is running
   * ============================================================ */

  const isAnyRunning = useMemo(
    () => cells.some((c) => c.status === "running"),
    [cells]
  );

  /* ============================================================
   * Render config panel for each stage
   * ============================================================ */

  function renderConfigPanel(stage: StageKey) {
    const cell = cells.find((c) => c.stage === stage)!;

    switch (stage) {
      case "input":
        return (
          <InputExecution
            onChange={(cfg) => handleConfigChange("input", cfg)}
            file={inputFile}
            setFile={setInputFile}
          />
        );
      case "preprocessing":
        return (
          <Preprocessing
            onChange={(cfg) => handleConfigChange("preprocessing", cfg)}
          />
        );
      case "assembly":
        return (
          <AssemblyBinning
            onChange={(cfg) => handleConfigChange("assembly", cfg)}
          />
        );
      case "taxonomy":
        return (
          <TaxonomyFiltering
            onChange={(cfg) => handleConfigChange("taxonomy", cfg)}
          />
        );
      case "specialized":
        return (
          <SpecializedAnalyses
            onChange={(cfg) => handleConfigChange("specialized", cfg)}
          />
        );
      case "annotation":
        return (
          <AnnotationGeneCatalog
            onChange={(cfg) => handleConfigChange("annotation", cfg)}
          />
        );
      case "phylogeny":
        return (
          <PhylogenyFinal
            onChange={(cfg) => handleConfigChange("phylogeny", cfg)}
          />
        );
    }
  }

  /* ============================================================
   * Render
   * ============================================================ */

  return (
    <div className="space-y-4 w-full">
      {/* ---- cells ---- */}
      {cells.map((cell, idx) => (
        <div key={cell.stage} onClick={() => setSelectedStage(cell.stage)}>
          {/* connector line between cells */}
          {idx > 0 && (
            <div className="flex justify-center py-1">
              <div className="w-px h-4 bg-secondary/30" />
            </div>
          )}

          <MagusCell
            index={idx + 1}
            cell={cell}
            warnings={warningsForStage(cell.stage)}
            onRun={runStage}
            onConfigChange={handleConfigChange}
            isAnotherRunning={isAnyRunning && cell.status !== "running"}
          >
            {renderConfigPanel(cell.stage)}
          </MagusCell>
        </div>
      ))}

      {/* ---- toolbar ---- */}
      <CellToolbar
        onRunAll={runAll}
        onRunFromSelected={runFromSelected}
        onResetAll={resetAll}
        isRunning={isAnyRunning}
      />
    </div>
  );
}
