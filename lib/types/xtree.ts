/* ============================================================
 * XTree shared types — frontend & API contract
 * ============================================================
 * Type definitions for the simplified XTree interface.
 * Used by: XTree component, API route, SSE hook.
 *
 * Aligned with PRD §5.4 (XTree Changes).
 * ============================================================ */

/* -------------------- XTree mode -------------------- */

export type XTreeMode = "ALIGN" | "BUILD";

/* -------------------- execution status -------------------- */

export type XTreeStatus = "idle" | "running" | "success" | "error";

/* -------------------- SSE event payloads -------------------- */

/**
 * Events streamed from POST /api/xtree/run.
 * Same shape as single-stage MAGUS events.
 */
export type XTreeSSEEvent =
  | { event: "stdout"; data: { line: string } }
  | { event: "stderr"; data: { line: string } }
  | { event: "status"; data: { status: XTreeStatus; outputFiles?: string[]; error?: string } };

/* -------------------- API request -------------------- */

/** POST /api/xtree/run — file is sent as FormData, params as JSON string. */
export type XTreeRunParams = {
  mode: XTreeMode;
  global: {
    threads: number;
    logOut: string;
  };
  align?: {
    db: "gtdb" | "refseq";
    confidence: number;
    outputs: {
      perq: boolean;
      ref: boolean;
      tax: boolean;
      cov: boolean;
      orthog: boolean;
    };
    algorithms: {
      redistribute: boolean;
      fastRedistribute: boolean;
      shallowLca: boolean;
    };
    performance: {
      copyMem: boolean;
      doForage: boolean;
      halfForage: boolean;
      noAdamantium: boolean;
    };
  };
  build?: {
    comp: 0 | 1 | 2;
    k: number;
    hasMap: boolean;
  };
};

/* -------------------- output file -------------------- */

export type OutputFile = {
  name: string;
  size: number;
  path: string;
};
