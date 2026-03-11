/* ============================================================
 * MAGUS shared types — frontend & API contract
 * ============================================================
 * Central type definitions for the cell-based MAGUS interface.
 * Used by: MagusNotebook, MagusCell, CellOutput, API routes.
 *
 * Aligned with PRD §6.4 (Cell Data Model) and §6.5 (API Surface).
 * ============================================================ */

/* -------------------- stage keys -------------------- */

/**
 * Each key maps 1:1 to a pipeline stage / notebook cell.
 * Order matters — it defines the default top-to-bottom rendering.
 */
export type StageKey =
  | "input"
  | "preprocessing"
  | "assembly"
  | "taxonomy"
  | "specialized"
  | "annotation"
  | "phylogeny";

/** Ordered list used by MagusNotebook to render cells in sequence. */
export const STAGE_ORDER: StageKey[] = [
  "input",
  "preprocessing",
  "assembly",
  "taxonomy",
  "specialized",
  "annotation",
  "phylogeny",
];

/** Human-readable labels for each stage (shown in cell headers). */
export const STAGE_LABELS: Record<StageKey, string> = {
  input: "Input & Execution Settings",
  preprocessing: "QC / Preprocessing",
  assembly: "Assembly & Binning",
  taxonomy: "Taxonomy & Filtering",
  specialized: "Specialized Analyses (Euk / Virus)",
  annotation: "Annotation & Gene Catalogs",
  phylogeny: "Phylogeny & Final Outputs",
};

/* -------------------- cell status -------------------- */

/** PRD §6.3 — cell state machine. */
export type CellStatus = "idle" | "running" | "success" | "error";

/* -------------------- cell model -------------------- */

/** PRD §6.4 — data model for a single MAGUS notebook cell. */
export type MagusCellState = {
  stage: StageKey;
  label: string;
  /** Stage-specific parameters (shape varies per stage). */
  config: Record<string, any>;
  status: CellStatus;
  startedAt?: number;
  finishedAt?: number;
  /** Accumulated stdout (appended during SSE streaming). */
  stdout: string;
  /** Accumulated stderr (appended during SSE streaming). */
  stderr: string;
  /** Paths to output artifacts after successful completion. */
  outputFiles: string[];
  /** Error message when status === "error". */
  error?: string;
};

/* -------------------- output file -------------------- */

export type OutputFile = {
  name: string;
  size: number;
  path: string;
};

/* -------------------- SSE event payloads -------------------- */

/**
 * Events streamed from POST /api/magus/run (single stage).
 * See PRD §6.5.
 */
export type MagusSSEEvent =
  | { event: "stdout"; data: { line: string } }
  | { event: "stderr"; data: { line: string } }
  | { event: "status"; data: { status: CellStatus; outputFiles?: string[]; error?: string } };

/**
 * Events streamed from POST /api/magus/run-all (sequential).
 * See PRD §6.5.
 */
export type MagusRunAllSSEEvent =
  | { event: "stage-start"; data: { stage: StageKey } }
  | { event: "stdout"; data: { stage: StageKey; line: string } }
  | { event: "stderr"; data: { stage: StageKey; line: string } }
  | { event: "stage-complete"; data: { stage: StageKey; status: CellStatus; outputFiles?: string[]; error?: string } };

/* -------------------- API request bodies -------------------- */

/** POST /api/magus/run — run a single stage. */
export type RunStageRequest = {
  stage: StageKey;
  config: Record<string, any>;
};

/** POST /api/magus/run-all — run all stages sequentially. */
export type RunAllRequest = {
  stages: Record<StageKey, { config: Record<string, any> }>;
};

/** GET /api/magus/output?stage=<key> response. */
export type StageOutputResponse = {
  files: OutputFile[];
};
