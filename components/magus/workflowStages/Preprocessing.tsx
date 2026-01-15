"use client";

import { useEffect, useState } from "react";

type Props = {
  enabled: boolean;
  onToggle: () => void;
  onChange: (config: any) => void;
};

export default function Preprocessing({
  enabled,
  onToggle,
  onChange,
}: Props) {
  /* -------------------- step toggles -------------------- */

  const [runQC, setRunQC] = useState<boolean>(false);
  const [runSubsample, setRunSubsample] = useState<boolean>(false);
  const [runFilter, setRunFilter] = useState<boolean>(false);

  /* -------------------- subsampling -------------------- */

  const [depth, setDepth] = useState<number>(100_000_000);
  const [subsampleThreads, setSubsampleThreads] = useState<number>(4);
  const [subsampleWorkers, setSubsampleWorkers] = useState<number>(4);

  /* -------------------- filtering -------------------- */

  const [minKmers, setMinKmers] = useState<number>(10);
  const [filterThreads, setFilterThreads] = useState<number>(1);
  const [filterWorkers, setFilterWorkers] = useState<number>(1);

  /* -------------------- advanced toggle -------------------- */

  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  /* -------------------- propagate config -------------------- */

  useEffect(() => {
    onChange({
      qc: {
        enabled: runQC,
      },
      subsample: {
        enabled: runSubsample,
        depth,
        threads: subsampleThreads,
        max_workers: subsampleWorkers,
      },
      filter: {
        enabled: runFilter,
        min_kmers: minKmers,
        threads: filterThreads,
        max_workers: filterWorkers,
      },
    });
  }, [
    runQC,
    runSubsample,
    runFilter,
    depth,
    subsampleThreads,
    subsampleWorkers,
    minKmers,
    filterThreads,
    filterWorkers,
  ]);

  /* -------------------- render -------------------- */

  return (
    <div className="border border-secondary/30 p-5 space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <label className="font-bold text-md">
          <input
            type="checkbox"
            checked={enabled}
            onChange={onToggle}
            className="mr-2"
          />
          Read QC & preprocessing
        </label>

        <span className="text-sm text-secondary">
          Optional
        </span>
      </div>

      {!enabled && (
        <p className="text-sm text-secondary">
          Quality control, subsampling, and read filtering prior to assembly.
        </p>
      )}

      {enabled && (
        <>
          {/* step toggles */}
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={runQC}
                onChange={(e) => setRunQC(e.target.checked)}
              />
              Run read QC
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={runSubsample}
                onChange={(e) => setRunSubsample(e.target.checked)}
              />
              Subsample reads
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={runFilter}
                onChange={(e) => setRunFilter(e.target.checked)}
              />
              Filter reads using XTree evidence
            </label>
          </div>

          {/* subsampling basic */}
          {runSubsample && (
            <div className="space-y-3">
              <p className="font-bold">Subsampling</p>

              <label className="block">
                Target reads per sample
                <input
                  type="number"
                  min={1}
                  value={depth}
                  onChange={(e) => setDepth(Number(e.target.value))}
                  className="w-full border p-1 bg-transparent"
                />
              </label>
            </div>
          )}

          {/* filtering basic */}
          {runFilter && (
            <div className="space-y-3">
              <p className="font-bold">Filtering</p>

              <label className="block">
                Minimum k-mer evidence per read
                <input
                  type="number"
                  min={1}
                  value={minKmers}
                  onChange={(e) => setMinKmers(Number(e.target.value))}
                  className="w-full border p-1 bg-transparent"
                />
              </label>

              <p className="text-sm text-secondary">
                Requires XTree per-query (.perq) files from a prior run.
              </p>
            </div>
          )}

          {/* advanced toggle */}
          {(runSubsample || runFilter) && (
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-accent"
            >
              {showAdvanced
                ? "Hide advanced settings"
                : "Show advanced settings"}
            </button>
          )}

          {/* advanced settings */}
          {showAdvanced && (
            <div className="space-y-4">
              {runSubsample && (
                <>
                  <p className="font-bold">Subsampling (advanced)</p>

                  <label className="block">
                    Threads
                    <input
                      type="number"
                      min={1}
                      value={subsampleThreads}
                      onChange={(e) =>
                        setSubsampleThreads(Number(e.target.value))
                      }
                      className="w-full border p-1 bg-transparent"
                    />
                  </label>

                  <label className="block">
                    Max parallel samples
                    <input
                      type="number"
                      min={1}
                      value={subsampleWorkers}
                      onChange={(e) =>
                        setSubsampleWorkers(Number(e.target.value))
                      }
                      className="w-full border p-1 bg-transparent"
                    />
                  </label>
                </>
              )}

              {runFilter && (
                <>
                  <p className="font-bold">Filtering (advanced)</p>

                  <label className="block">
                    Threads
                    <input
                      type="number"
                      min={1}
                      value={filterThreads}
                      onChange={(e) =>
                        setFilterThreads(Number(e.target.value))
                      }
                      className="w-full border p-1 bg-transparent"
                    />
                  </label>

                  <label className="block">
                    Max parallel samples
                    <input
                      type="number"
                      min={1}
                      value={filterWorkers}
                      onChange={(e) =>
                        setFilterWorkers(Number(e.target.value))
                      }
                      className="w-full border p-1 bg-transparent"
                    />
                  </label>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
