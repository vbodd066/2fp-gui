"use client";

import { useEffect, useState } from "react";

type Props = {
  enabled: boolean;
  onToggle: () => void;
  onChange: (config: any) => void;
};

export default function TaxonomyFiltering({
  enabled,
  onToggle,
  onChange,
}: Props) {
  /* -------------------- taxonomy -------------------- */

  const [runTaxonomy, setRunTaxonomy] = useState<boolean>(true);

  const [db, setDb] = useState<"gtdb" | "refseq">("gtdb");
  const [coverageCutoff, setCoverageCutoff] = useState<number>(0.05);

  /* -------------------- filtering -------------------- */

  const [runFiltering, setRunFiltering] = useState<boolean>(false);
  const [kmerThreshold, setKmerThreshold] = useState<number>(10);

  /* -------------------- skip outputs -------------------- */

  const [skipPerq, setSkipPerq] = useState<boolean>(false);
  const [skipCov, setSkipCov] = useState<boolean>(false);
  const [skipRef, setSkipRef] = useState<boolean>(false);

  /* -------------------- advanced -------------------- */

  const [threads, setThreads] = useState<number>(4);
  const [maxWorkers, setMaxWorkers] = useState<number>(1);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  /* -------------------- propagate config -------------------- */

  useEffect(() => {
    onChange({
      taxonomy: {
        enabled: runTaxonomy,
        db,
        coverage_cutoff: coverageCutoff,
        skip_outputs: {
          perq: skipPerq,
          coverage: skipCov,
          reference: skipRef,
        },
      },
      filter_mags: {
        enabled: runFiltering,
        kmer_threshold: kmerThreshold,
      },
      resources: {
        threads,
        max_workers: maxWorkers,
      },
    });
  }, [
    runTaxonomy,
    db,
    coverageCutoff,
    skipPerq,
    skipCov,
    skipRef,
    runFiltering,
    kmerThreshold,
    threads,
    maxWorkers,
  ]);

  /* -------------------- render -------------------- */

  return (
    <div
      className={`border border-secondary/30 transition-all
        ${enabled ? "p-5 space-y-6" : "p-3 space-y-2"}
      `}
    >
      {/* header */}
      <div className="flex items-center justify-between">
        <label
          className="flex items-center font-bold text-md cursor-pointer
                    transition-colors duration-150
                    text-secondary
                    hover:text-accent hover:scale-104"
        >
          <input
            type="checkbox"
            checked={enabled}
            onChange={onToggle}
            className="mr-2"
          />
          Taxonomy & Filtering
        </label>

        <span className="text-sm text-secondary">
          Optional
        </span>
      </div>

      {!enabled && (
        <p className="text-sm text-secondary">
          Classify contigs and MAGs using XTree and apply evidence-based
          filtering.
        </p>
      )}

      {enabled && (
        <>
          {/* taxonomy */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={runTaxonomy}
                onChange={(e) =>
                  setRunTaxonomy(e.target.checked)
                }
              />
              Run taxonomy
            </label>

            {runTaxonomy && (
              <>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  XTree database
                  <select
                    value={db}
                    onChange={(e) =>
                      setDb(e.target.value as any)
                    }
                    className="w-full border p-1 bg-transparent h-8"
                  >
                    <option value="gtdb">GTDB</option>
                    <option value="refseq">RefSeq</option>
                  </select>
                </label>

                <label className="block">
                  Coverage cutoff
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={1}
                    value={coverageCutoff}
                    onChange={(e) =>
                      setCoverageCutoff(
                        Number(e.target.value)
                      )
                    }
                    className="w-full border p-1 bg-transparent rounded-lg"
                  />
                  </label>
                </div>
              </>
            )}
          </div>

          {/* filtering */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={runFiltering}
                onChange={(e) =>
                  setRunFiltering(e.target.checked)
                }
              />
              Filter MAGs using XTree evidence
            </label>

            {runFiltering && (
              <>
                <label className="block">
                  Minimum k-mer evidence per contig
                  <input
                    type="number"
                    min={1}
                    value={kmerThreshold}
                    onChange={(e) =>
                      setKmerThreshold(
                        Number(e.target.value)
                      )
                    }
                    className="w-full border p-1 bg-transparent rounded-lg"
                  />
                </label>

                <p className="text-sm text-secondary">
                  Requires per-query (.perq) files generated by XTree.
                </p>
              </>
            )}
          </div>

          {/* advanced toggle */}
          {(runTaxonomy || runFiltering) && (
            <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-accent
                    transition
                    hover:text-foreground hover:scale-[1.03]
                    active:scale-[0.98]"
        >
          {showAdvanced ? "Hide advanced settings" : "Show advanced settings"}
        </button>
          )}

          {/* advanced */}
          {showAdvanced && (
            <div className="space-y-4">
              {runTaxonomy && (
                <>
                  <p className="font-bold">
                    Taxonomy outputs
                  </p>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={skipPerq}
                        onChange={(e) =>
                          setSkipPerq(
                            e.target.checked
                          )
                        }
                      />
                      Skip per-query output
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={skipCov}
                        onChange={(e) =>
                          setSkipCov(
                            e.target.checked
                          )
                        }
                      />
                      Skip coverage output
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={skipRef}
                        onChange={(e) =>
                          setSkipRef(
                            e.target.checked
                          )
                        }
                      />
                      Skip reference output
                    </label>
                  </div>
                </>
              )}

              <p className="font-bold">
                Resource limits
              </p>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  Threads per XTree run
                  <input
                    type="number"
                    min={1}
                    value={threads}
                    onChange={(e) =>
                      setThreads(
                        Number(e.target.value)
                      )
                    }
                    className="w-full border p-1 bg-transparent rounded-lg"
                  />
                </label>

                <label className="block">
                  Max parallel samples
                  <input
                    type="number"
                    min={1}
                    value={maxWorkers}
                    onChange={(e) =>
                      setMaxWorkers(
                        Number(e.target.value)
                      )
                    }
                    className="w-full border p-1 bg-transparent rounded-lg"
                  />
                </label>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
