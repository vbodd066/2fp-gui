"use client";

import { useEffect, useState } from "react";

type Props = {
  enabled: boolean;
  onToggle: () => void;
  onChange: (config: any) => void;
};

export default function PhylogenyFinal({
  enabled,
  onToggle,
  onChange,
}: Props) {
  /* -------------------- phylogeny -------------------- */

  const [buildTree, setBuildTree] = useState<boolean>(false);
  const [useIQTree, setUseIQTree] = useState<boolean>(false);
  const [coverageThreshold, setCoverageThreshold] =
    useState<number>(100.0);
  const [evalueCutoff, setEvalueCutoff] =
    useState<number>(0.001);
  const [trimalCutoff, setTrimalCutoff] =
    useState<number | null>(null);

  /* -------------------- final MAG export -------------------- */

  const [finalizeMags, setFinalizeMags] =
    useState<boolean>(false);

  /* -------------------- resources -------------------- */

  const [threads, setThreads] = useState<number>(4);

  /* -------------------- advanced -------------------- */

  const [showAdvanced, setShowAdvanced] =
    useState<boolean>(false);

  /* -------------------- propagate config -------------------- */

  useEffect(() => {
    onChange({
      phylogeny: {
        enabled: buildTree,
        iqtree: useIQTree,
        coverage_threshold: coverageThreshold,
        evalue_cutoff: evalueCutoff,
        trimal_cutoff: trimalCutoff,
      },
      finalize_mags: {
        enabled: finalizeMags,
      },
      resources: {
        threads,
      },
    });
  }, [
    buildTree,
    useIQTree,
    coverageThreshold,
    evalueCutoff,
    trimalCutoff,
    finalizeMags,
    threads,
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
          Phylogeny & Final Outputs
        </label>

        <span className="text-sm text-secondary">
          Optional
        </span>
      </div>

      {!enabled && (
        <p className="text-sm text-secondary">
          Build phylogenetic trees and finalize curated MAG
          outputs.
        </p>
      )}

      {enabled && (
        <>
          {/* phylogeny */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={buildTree}
                onChange={(e) =>
                  setBuildTree(e.target.checked)
                }
              />
              Build phylogenetic tree
            </label>

            {buildTree && (
              <>
                <label className="block">
                  Tree building method
                  <select
                    value={useIQTree ? "iqtree" : "fasttree"}
                    onChange={(e) =>
                      setUseIQTree(
                        e.target.value === "iqtree"
                      )
                    }
                    className="w-full border p-1 bg-transparent"
                  >
                    <option value="fasttree">
                      FastTree (default)
                    </option>
                    <option value="iqtree">
                      IQ-TREE
                    </option>
                  </select>
                </label>

                <label className="block">
                  Coverage threshold (%)
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    value={coverageThreshold}
                    onChange={(e) =>
                      setCoverageThreshold(
                        Number(e.target.value)
                      )
                    }
                    className="w-full border p-1 bg-transparent"
                  />
                </label>
              </>
            )}
          </div>

          {/* finalize MAGs */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={finalizeMags}
                onChange={(e) =>
                  setFinalizeMags(
                    e.target.checked
                  )
                }
              />
              Finalize bacterial / archaeal MAGs
            </label>

            {finalizeMags && (
              <p className="text-sm text-secondary">
                Merge and export high-quality MAGs from
                single and co-assembly workflows.
              </p>
            )}
          </div>

          {/* advanced toggle */}
          {(buildTree || finalizeMags) && (
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
              {buildTree && (
                <>
                  <p className="font-bold">
                    Phylogeny (advanced)
                  </p>

                  <label className="block">
                    E-value cutoff
                    <input
                      type="number"
                      step="0.0001"
                      value={evalueCutoff}
                      onChange={(e) =>
                        setEvalueCutoff(
                          Number(e.target.value)
                        )
                      }
                      className="w-full border p-1 bg-transparent"
                    />
                  </label>

                  <label className="block">
                    trimAl gap cutoff
                    <input
                      type="number"
                      step="0.01"
                      value={
                        trimalCutoff ?? ""
                      }
                      onChange={(e) =>
                        setTrimalCutoff(
                          e.target.value === ""
                            ? null
                            : Number(
                                e.target.value
                              )
                        )
                      }
                      placeholder="Leave empty to skip"
                      className="w-full border p-1 bg-transparent"
                    />
                  </label>
                </>
              )}

              <p className="font-bold">
                Resource limits
              </p>

              <label className="block">
                Threads
                <input
                  type="number"
                  min={1}
                  value={threads}
                  onChange={(e) =>
                    setThreads(
                      Number(e.target.value)
                    )
                  }
                  className="w-full border p-1 bg-transparent"
                />
              </label>
            </div>
          )}
        </>
      )}
    </div>
  );
}
