"use client";

import { useMemo, useState } from "react";
import {
  enforceStageDependencies,
  evaluateStageDependencies,
  evaluateStageIntentWarnings,
} from "./magus/dependencies";
import InputExecution from "./magus/workflowStages/InputExecution";
import Preprocessing from "./magus/workflowStages/Preprocessing";
import AssemblyBinning from "./magus/workflowStages/AssemblyBinning";
import TaxonomyFiltering from "./magus/workflowStages/TaxonomyFiltering";
import SpecializedAnalyses from "./magus/workflowStages/SpecializedAnalyses";
import AnnotationGeneCatalog from "./magus/workflowStages/AnnotationGeneCatalog";
import PhylogenyFinal from "./magus/workflowStages/PhylogenyFinal";

/* -------------------- types -------------------- */

type StageKey =
  | "input"
  | "preprocessing"
  | "assembly"
  | "taxonomy"
  | "specialized"
  | "annotation"
  | "phylogeny";

type StageState<T> = {
  enabled: boolean;
  config: T;
};

/* -------------------- component -------------------- */

export default function MAGUS() {
  /* -------------------- global inputs -------------------- */
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* -------------------- workflow stages -------------------- */

  const [lastToggledStage, setLastToggledStage] =
  useState<StageKey | null>(null);

  const [stages, setStages] = useState<Record<StageKey, StageState<any>>>({
    input: {
      enabled: true,
      config: {},
    },
    preprocessing: {
      enabled: false,
      config: {},
    },
    assembly: {
      enabled: true,
      config: {},
    },
    taxonomy: {
      enabled: false,
      config: {},
    },
    specialized: {
      enabled: false,
      config: {},
    },
    annotation: {
      enabled: false,
      config: {},
    },
    phylogeny: {
      enabled: false,
      config: {},
    },
  });

/* -------------------- dependency-safe updater -------------------- */

function updateStages(
  nextStages: Record<StageKey, StageState<any>>
) {
  setStages(enforceStageDependencies(nextStages));
}

/* -------------------- helpers -------------------- */

function toggleStage(stage: StageKey) {
  setLastToggledStage(stage);

  updateStages({
    ...stages,
    [stage]: {
      ...stages[stage],
      enabled: !stages[stage].enabled,
    },
  });
}

function updateStageConfig(stage: StageKey, config: any) {
  updateStages({
    ...stages,
    [stage]: {
      ...stages[stage],
      config,
    },
  });
}

/* -------------------- dependency warnings -------------------- */

const dependencyWarnings = useMemo(() => {
  return [
    ...evaluateStageDependencies(stages),
    ...evaluateStageIntentWarnings(stages, lastToggledStage),
  ];
}, [stages, lastToggledStage]);


  /* -------------------- pipeline preview -------------------- */

  const pipelinePreview = useMemo(() => {
    return Object.entries(stages)
      .filter(([, v]) => v.enabled)
      .map(([k]) => {
        switch (k) {
          case "input":
            return "Input";
          case "preprocessing":
            return "QC / Preprocessing";
          case "assembly":
            return "Assembly & Binning";
          case "taxonomy":
            return "Taxonomy & Filtering";
          case "specialized":
            return "Euk / Virus Analyses";
          case "annotation":
            return "Annotation & Gene Catalogs";
          case "phylogeny":
            return "Phylogeny";
          default:
            return null;
        }
      })
      .filter(Boolean)
      .join(" → ");
  }, [stages]);

  /* -------------------- submit -------------------- */

  async function submitMAGUS() {
    if (!inputFile || !email) return;

    setSubmitting(true);
    setError(null);

    const params = {
      stages,
    };

    const formData = new FormData();
    formData.append("file", inputFile);
    formData.append("email", email);
    formData.append("params", JSON.stringify(params));

    try {
      const res = await fetch("/api/magus", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  /* -------------------- render -------------------- */

  return (
    <div className="space-y-10 w-full">
      {/* header */}
      <div className="flex justify-between pb-3">
        <h3 className="text-xl font-semibold">MAGUS Workflow</h3>
        <div className="flex gap-4 text-sm">
          <a
            href="https://doi.org/10.64898/2025.12.22.696022"
            target="_blank"
            className="text-accent hover:underline"
          >
            Manuscript
          </a>
          <a
            href="https://github.com/two-frontiers-project/2FP_MAGUS"
            target="_blank"
            className="text-accent hover:underline"
          >
            GitHub
          </a>
        </div>
      </div>

      {dependencyWarnings.length > 0 && (
      <div className="border border-yellow-500/40 bg-yellow-500/5 p-4 text-sm">
        <p className="font-bold text-yellow-400 mb-1">
          Workflow dependency warnings
        </p>
        <ul className="list-disc list-inside space-y-1">
          {dependencyWarnings.map((w, i) => (
            <li key={i}>{w.message}</li>
          ))}
        </ul>
      </div>
    )}


      {/* workflow stages */}
      <div className="space-y-6">
        <InputExecution
          enabled={stages.input.enabled}
          onToggle={() => toggleStage("input")}
          onChange={(cfg) => updateStageConfig("input", cfg)}
          file={inputFile}
          setFile={setInputFile}
        />

        <Preprocessing
          enabled={stages.preprocessing.enabled}
          onToggle={() => toggleStage("preprocessing")}
          onChange={(cfg) => updateStageConfig("preprocessing", cfg)}
        />

        <AssemblyBinning
          enabled={stages.assembly.enabled}
          onToggle={() => toggleStage("assembly")}
          onChange={(cfg) => updateStageConfig("assembly", cfg)}
        />

        <TaxonomyFiltering
          enabled={stages.taxonomy.enabled}
          onToggle={() => toggleStage("taxonomy")}
          onChange={(cfg) => updateStageConfig("taxonomy", cfg)}
        />

        <SpecializedAnalyses
          enabled={stages.specialized.enabled}
          onToggle={() => toggleStage("specialized")}
          onChange={(cfg) => updateStageConfig("specialized", cfg)}
        />

        <AnnotationGeneCatalog
          enabled={stages.annotation.enabled}
          onToggle={() => toggleStage("annotation")}
          onChange={(cfg) => updateStageConfig("annotation", cfg)}
        />

        <PhylogenyFinal
          enabled={stages.phylogeny.enabled}
          onToggle={() => toggleStage("phylogeny")}
          onChange={(cfg) => updateStageConfig("phylogeny", cfg)}
        />
      </div>

      {/* pipeline preview */}
      <div className="border p-3 text-sm bg-black/40">
        <p className="font-bold mb-1">Pipeline summary</p>
        <p>{pipelinePreview || "No stages enabled"}</p>
      </div>

      {/* email */}
      <label className="block">
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-1 bg-transparent"
        />
      </label>

      {/* submit */}
      {!submitted ? (
        <>
          <button
            onClick={submitMAGUS}
            disabled={!inputFile || !email || submitting}
            className="bg-accent px-4 py-2 text-black disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit MAGUS job"}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </>
      ) : (
        <p className="text-green-500">Job submitted successfully.</p>
      )}
    </div>
  );
}
