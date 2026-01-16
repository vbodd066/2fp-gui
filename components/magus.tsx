"use client";

import { useMemo, useState } from "react";
import { HelpCircle } from "lucide-react";
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
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold">MAGUS Workflow</h3>

          <div className="relative group">
            <button
              type="button"
              className="text-secondary hover:text-accent transition"
              aria-label="About MAGUS"
            >
              <HelpCircle size={20} />
            </button>

            <div className="absolute hidden group-hover:block
                            bg-black text-foreground text-sm leading-relaxed
                            p-4 rounded-lg w-md
                            left-0 top-7 z-10">
              <em><strong>MAGUS</strong></em> is a modular metagenomic analysis toolkit designed for deeply
              sequenced, multi-domain datasets—particularly those dominated by large
              eukaryotic genomes. Rather than enforcing a fixed pipeline, MAGUS provides
              interoperable tools for iterative assembly, filtering, co-assembly, genome
              recovery, and gene catalog construction, allowing workflows to scale with
              both data complexity and available compute.
            </div>
          </div>
        </div>

        {/* links */}
        <div className="flex gap-4 text-sm">
          {/* How to use */}
          <div className="relative group">
            <span
              className="cursor-default text-accent transition
                        hover:text-foreground hover:scale-[1.05]"
            >
              How to use
            </span>

            {/* hover panel */}
            <div
              className="pointer-events-none absolute right-0 top-full mt-2 w-xl
                        rounded-md border border-border bg-background p-3 text-small
                        text-muted-foreground shadow-lg opacity-0 scale-95
                        transition-all duration-150
                        group-hover:opacity-100 group-hover:scale-100"
            >
              <p className="mb-2 text-foreground text-center font-medium">
                Quick usage guide
              </p>
              <ul className="space-y-1">
                <li>1 • Upload a single <strong>FASTQ</strong> file containing your sequences.</li>
                <li>2 • Set the <strong>stages</strong> and <strong>configuration</strong> of the MAGUS pipeline.</li>
                <li>3 • Enter your <strong>email</strong> address, and <strong>submit</strong> a job.</li>
              </ul>
            </div>
          </div>
          {/* Manuscript */}
          <a
            href="https://doi.org/10.64898/2025.12.22.696022"
            target="_blank"
            className="text-accent transition
                      hover:text-foreground hover:scale-[1.05]"
          >
            Manuscript
          </a>

          <a
            href="https://github.com/two-frontiers-project/2FP_MAGUS"
            target="_blank"
            className="text-accent transition
                      hover:text-foreground hover:scale-[1.05]"
          >
            GitHub
          </a>
        </div>
      </div>

    {dependencyWarnings.length > 0 && (
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2
                  z-50 w-[90%] max-w-2xl
                  border border-yellow-500/40
                  bg-background
                  shadow-lg
                  p-4 text-sm rounded-lg"
      >
        <p className="font-bold text-yellow-400 mb-1">
          Workflow dependency warnings
        </p>
        <ul className="list-disc list-inside space-y-1 text-secondary">
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
          className="w-full border p-1 h-10 bg-transparent rounded-lg"
        />
      </label>

      {/* submit */}
      {!submitted ? (
        <>
          <button
            onClick={submitMAGUS}
            disabled={!inputFile || !email || submitting}
            className="bg-accent px-6 py-3 text-black rounded-lg
                      font-semibold transition
                      hover:brightness-95 hover:scale-[1.02]
                      disabled:opacity-50 disabled:hover:scale-100"
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
