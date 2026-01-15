/* ============================================================
 * MAGUS workflow dependency engine
 * ============================================================
 * Centralized logic for:
 *  - cross-stage dependencies
 *  - auto-disabling invalid stages
 *  - dependency warnings
 * ============================================================
 */

/* -------------------- stage keys -------------------- */

export type StageKey =
  | "input"
  | "preprocessing"
  | "assembly"
  | "taxonomy"
  | "specialized"
  | "annotation"
  | "phylogeny";

/* -------------------- workflow state -------------------- */

export type StageState = {
  enabled: boolean;
  config: any;
};

export type WorkflowState = Record<StageKey, StageState>;

/* -------------------- warnings -------------------- */

export type DependencyWarning = {
  stage: StageKey;
  message: string;
};

/* -------------------- dependency rules -------------------- */

type DependencyRule = {
  stage: StageKey;
  requires: StageKey[];
  message: string;
};

/**
 * Declarative dependency graph.
 * "stage" depends on all stages in "requires".
 */
export const STAGE_DEPENDENCY_RULES: DependencyRule[] = [
  {
    stage: "preprocessing",
    requires: ["input"],
    message:
      "Read QC and preprocessing require an input FASTQ file and execution settings.",
  },
  {
    stage: "assembly",
    requires: ["input"],
    message:
      "Assembly requires sequencing input and execution configuration.",
  },
  {
    stage: "taxonomy",
    requires: ["assembly"],
    message:
      "Taxonomy requires assemblies or MAGs from the Assembly & Binning stage.",
  },
  {
    stage: "specialized",
    requires: ["assembly"],
    message:
      "Virus and eukaryote detection require assemblies or bins.",
  },
  {
    stage: "annotation",
    requires: ["assembly"],
    message:
      "Annotation requires assembled contigs or MAGs.",
  },
  {
    stage: "phylogeny",
    requires: ["annotation"],
    message:
      "Phylogeny requires annotated genes from the Annotation stage.",
  },
];

/* ============================================================
 * Dependency evaluation (warnings only)
 * ============================================================
 */

export function evaluateStageDependencies(
  stages: WorkflowState
): DependencyWarning[] {
  const warnings: DependencyWarning[] = [];

  for (const rule of STAGE_DEPENDENCY_RULES) {
    if (!stages[rule.stage]?.enabled) continue;

    const missing = rule.requires.filter(
      (req) => !stages[req]?.enabled
    );

    if (missing.length > 0) {
      warnings.push({
        stage: rule.stage,
        message: rule.message,
      });
    }
  }

  return warnings;
}

/* ============================================================
 * Auto-disable invalid stages
 * ============================================================
 */

/**
 * Enforce dependencies by auto-disabling stages whose
 * requirements are not satisfied.
 *
 * This function:
 *  - never mutates the input
 *  - cascades (disabling assembly disables taxonomy, etc.)
 *  - is deterministic
 */
export function enforceStageDependencies(
  stages: WorkflowState
): WorkflowState {
  // Deep-ish clone (config objects are preserved)
  let next: WorkflowState = structuredClone(stages);

  let changed = true;

  // Iterate until no more stages are auto-disabled
  while (changed) {
    changed = false;

    for (const rule of STAGE_DEPENDENCY_RULES) {
      const stage = rule.stage;

      if (!next[stage]?.enabled) continue;

      const missing = rule.requires.filter(
        (req) => !next[req]?.enabled
      );

      if (missing.length > 0) {
        next[stage] = {
          ...next[stage],
          enabled: false,
        };
        changed = true;
      }
    }
  }

  return next;
}

/* ============================================================
 * Helpers
 * ============================================================
 */

export function groupWarningsByStage(
  warnings: DependencyWarning[]
): Partial<Record<StageKey, string[]>> {
  const grouped: Partial<Record<StageKey, string[]>> = {};

  for (const w of warnings) {
    if (!grouped[w.stage]) grouped[w.stage] = [];
    grouped[w.stage]!.push(w.message);
  }

  return grouped;
}

export function evaluateStageIntentWarnings(
  stages: WorkflowState,
  attemptedStage: StageKey | null
): DependencyWarning[] {
  if (!attemptedStage) return [];

  const rule = STAGE_DEPENDENCY_RULES.find(
    (r) => r.stage === attemptedStage
  );
  if (!rule) return [];

  const missing = rule.requires.filter(
    (req) => !stages[req]?.enabled
  );

  if (missing.length === 0) return [];

  return [
    {
      stage: attemptedStage,
      message: rule.message,
    },
  ];
}
