/* ============================================================
 * MAGUS workflow compiler
 * ============================================================
 * Converts frontend workflow state into an ordered execution plan.
 * This file contains NO I/O and NO execution logic.
 * ============================================================
 */

/* -------------------- shared types -------------------- */

export type StageKey =
  | "input"
  | "preprocessing"
  | "assembly"
  | "taxonomy"
  | "specialized"
  | "annotation"
  | "phylogeny";

export type StageState = {
  enabled: boolean;
  config: any;
};

export type WorkflowState = {
  stages: Record<StageKey, StageState>;
};

/* -------------------- execution step -------------------- */

export type WorkflowStep = {
  id: string;
  stage: StageKey;
  command: string;
  args: Record<string, any>;
};

/* -------------------- public API -------------------- */

/**
 * Compile a MAGUS workflow into an ordered list of steps.
 */
export function compileWorkflow(
  workflow: WorkflowState
): WorkflowStep[] {
  const steps: WorkflowStep[] = [];

  const { stages } = workflow;

  /* --------------------------------------------------
   * Stage 1: Input
   * (no execution step)
   * -------------------------------------------------- */

  /* --------------------------------------------------
   * Stage 2: QC / preprocessing
   * -------------------------------------------------- */

  if (stages.preprocessing?.enabled) {
    steps.push({
      id: "qc",
      stage: "preprocessing",
      command: "magus qc",
      args: {
        ...stages.preprocessing.config,
      },
    });
  }

  /* --------------------------------------------------
   * Stage 3: Assembly & binning
   * -------------------------------------------------- */

  if (stages.assembly?.enabled) {
    const cfg = stages.assembly.config ?? {};

    if (cfg.singleAssembly !== false) {
      steps.push({
        id: "single-assembly",
        stage: "assembly",
        command: "magus single-assembly",
        args: cfg.singleAssembly ?? {},
      });
    }

    if (cfg.binning !== false) {
      steps.push({
        id: "binning",
        stage: "assembly",
        command: "magus binning",
        args: cfg.binning ?? {},
      });
    }

    if (cfg.clusterContigs) {
      steps.push({
        id: "cluster-contigs",
        stage: "assembly",
        command: "magus cluster-contigs",
        args: cfg.clusterContigs,
      });
    }

    if (cfg.coassembly) {
      steps.push({
        id: "coassembly",
        stage: "assembly",
        command: "magus coassembly",
        args: cfg.coassembly,
      });

      if (cfg.coassemblyBinning) {
        steps.push({
          id: "coassembly-binning",
          stage: "assembly",
          command: "magus coassembly-binning",
          args: cfg.coassemblyBinning,
        });
      }
    }
  }

  /* --------------------------------------------------
   * Stage 4: Taxonomy & filtering
   * -------------------------------------------------- */

  if (stages.taxonomy?.enabled) {
    const cfg = stages.taxonomy.config ?? {};

    if (cfg.taxonomy?.enabled !== false) {
      steps.push({
        id: "taxonomy",
        stage: "taxonomy",
        command: "magus taxonomy",
        args: cfg.taxonomy ?? {},
      });
    }

    if (cfg.filter_mags?.enabled) {
      steps.push({
        id: "filter-mags",
        stage: "taxonomy",
        command: "magus filter-mags",
        args: cfg.filter_mags,
      });
    }
  }

  /* --------------------------------------------------
   * Stage 5: Specialized analyses
   * -------------------------------------------------- */

  if (stages.specialized?.enabled) {
    const cfg = stages.specialized.config ?? {};

    if (cfg.viruses?.enabled) {
      steps.push({
        id: "find-viruses",
        stage: "specialized",
        command: "magus find-viruses",
        args: cfg.viruses,
      });
    }

    if (cfg.eukaryotes?.enabled) {
      steps.push({
        id: "find-euks",
        stage: "specialized",
        command: "magus find-euks",
        args: cfg.eukaryotes,
      });
    }

    if (cfg.dereplication?.enabled) {
      steps.push({
        id: "dereplicate",
        stage: "specialized",
        command: "magus dereplicate",
        args: cfg.dereplication,
      });
    }
  }

  /* --------------------------------------------------
   * Stage 6: Annotation & gene catalogs
   * -------------------------------------------------- */

  if (stages.annotation?.enabled) {
    const cfg = stages.annotation.config ?? {};

    if (cfg.orf_calling?.enabled !== false) {
      steps.push({
        id: "call-orfs",
        stage: "annotation",
        command: "magus call-orfs",
        args: cfg.orf_calling,
      });
    }

    if (cfg.annotation?.enabled !== false) {
      steps.push({
        id: "annotate",
        stage: "annotation",
        command: "magus annotate",
        args: cfg.annotation,
      });
    }

    if (cfg.gene_catalog?.enabled) {
      steps.push({
        id: "build-gene-catalog",
        stage: "annotation",
        command: "magus build-gene-catalog",
        args: cfg.gene_catalog,
      });

      steps.push({
        id: "consolidate-gene-catalog",
        stage: "annotation",
        command: "magus consolidate-gene-catalog",
        args: cfg.gene_catalog,
      });
    }
  }

  /* --------------------------------------------------
   * Stage 7: Phylogeny & final outputs
   * -------------------------------------------------- */

  if (stages.phylogeny?.enabled) {
    const cfg = stages.phylogeny.config ?? {};

    if (cfg.phylogeny?.enabled) {
      steps.push({
        id: "build-tree",
        stage: "phylogeny",
        command: "magus build-tree",
        args: cfg.phylogeny,
      });
    }

    if (cfg.finalize_mags?.enabled) {
      steps.push({
        id: "finalize-bacterial-mags",
        stage: "phylogeny",
        command: "magus finalize-bacterial-mags",
        args: cfg.finalize_mags,
      });
    }
  }

  return steps;
}
