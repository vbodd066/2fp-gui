"use client";

import { useEffect, useState } from "react";

type Props = {
  enabled: boolean;
  onToggle: () => void;
  onChange: (config: any) => void;
};

export default function AssemblyBinning({
  enabled,
  onToggle,
  onChange,
}: Props) {
  /* -------------------- assembly strategy -------------------- */

  const [strategy, setStrategy] =
    useState<"single" | "coassembly">("single");

  /* -------------------- binning -------------------- */

  const [enableBinning, setEnableBinning] = useState<boolean>(true);

  const [qualityPreset, setQualityPreset] =
    useState<"low" | "medium" | "high" | "custom">("medium");

  const [completeness, setCompleteness] = useState<number>(50);
  const [contamination, setContamination] = useState<number>(10);

  /* -------------------- resources -------------------- */

  const [threads, setThreads] = useState<number>(14);
  const [maxWorkers, setMaxWorkers] = useState<number>(4);

  /* -------------------- restart / advanced -------------------- */

  const [restartStage, setRestartStage] =
    useState<"none" | "binning" | "checkm" | "filtering">("none");

  const [testMode, setTestMode] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  /* -------------------- preset logic -------------------- */

  useEffect(() => {
    if (qualityPreset === "low") {
      setCompleteness(30);
      setContamination(15);
    }
    if (qualityPreset === "medium") {
      setCompleteness(50);
      setContamination(10);
    }
    if (qualityPreset === "high") {
      setCompleteness(70);
      setContamination(5);
    }
  }, [qualityPreset]);

  /* -------------------- propagate config -------------------- */

  useEffect(() => {
    onChange({
      strategy,
      binning: {
        enabled: enableBinning,
        quality_preset: qualityPreset,
        completeness,
        contamination,
        test_mode: testMode,
      },
      resources: {
        threads,
        max_workers: maxWorkers,
      },
      restart:
        restartStage === "none" ? null : restartStage,
    });
  }, [
    strategy,
    enableBinning,
    qualityPreset,
    completeness,
    contamination,
    threads,
    maxWorkers,
    restartStage,
    testMode,
  ]);

  /* -------------------- render -------------------- */

  return (
    <div className="border border-secondary/30 p-5 space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <label
          className="flex items-center font-bold text-md cursor-pointer
                    transition-colors duration-150
                    hover:text-accent hover:scale-104"
        >
          <input
            type="checkbox"
            checked={enabled}
            onChange={onToggle}
            className="mr-2"
          />
          Assembly & Binning
        </label>

        <span className="text-sm text-secondary">
          Required - Core stage
        </span>
      </div>

      {!enabled && (
        <p className="text-sm text-secondary">
          Generate assemblies and recover MAGs.
        </p>
      )}

      {enabled && (
        <>
          {/* assembly strategy */}
          <div className="space-y-3">
            <p className="font-bold">Assembly strategy</p>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="assembly"
                checked={strategy === "single"}
                onChange={() => setStrategy("single")}
              />
              Single-sample assembly
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="assembly"
                checked={strategy === "coassembly"}
                onChange={() => setStrategy("coassembly")}
              />
              Co-assembly across samples
            </label>
          </div>

          {/* binning */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={enableBinning}
                onChange={(e) =>
                  setEnableBinning(e.target.checked)
                }
              />
              Enable binning
            </label>

            {enableBinning && (
              <>
                <label className="block">
                  Quality preset
                  <select
                    value={qualityPreset}
                    onChange={(e) =>
                      setQualityPreset(
                        e.target.value as any
                      )
                    }
                    className="w-full border p-1 h-8 bg-transparent"
                  >
                    <option value="low">
                      Low quality (exploratory)
                    </option>
                    <option value="medium">
                      Medium quality (default)
                    </option>
                    <option value="high">
                      High quality (stringent)
                    </option>
                    <option value="custom">
                      Custom thresholds
                    </option>
                  </select>
                </label>

                {qualityPreset === "custom" && (
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      Completeness ≥ (%)
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={completeness}
                        onChange={(e) =>
                          setCompleteness(
                            Number(e.target.value)
                          )
                        }
                        className="w-full border p-1 bg-transparent"
                      />
                    </label>

                    <label className="block">
                      Contamination ≤ (%)
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={contamination}
                        onChange={(e) =>
                          setContamination(
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

          {/* advanced toggle */}
          <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-accent
                    transition
                    hover:text-foreground hover:scale-[1.03]
                    active:scale-[0.98]"
        >
          {showAdvanced ? "Hide advanced settings" : "Show advanced settings"}
        </button>

          {/* advanced settings */}
          {showAdvanced && (
            <div className="space-y-4">
              <p className="font-bold">Resources</p>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  Threads per assembly
                  <input
                    type="number"
                    min={1}
                    value={threads}
                    onChange={(e) =>
                      setThreads(Number(e.target.value))
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
                      setMaxWorkers(Number(e.target.value))
                    }
                    className="w-full border p-1 bg-transparent rounded-lg"
                  />
                </label>
              </div>

              <p className="font-bold">Execution control</p>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  Restart from stage
                  <select
                    value={restartStage}
                    onChange={(e) =>
                      setRestartStage(
                        e.target.value as any
                      )
                    }
                    className="w-full border p-1 bg-transparent h-8"
                  >
                    <option value="none">None</option>
                    <option value="binning">
                      Binning
                    </option>
                    <option value="checkm">
                      CheckM
                    </option>
                    <option value="filtering">
                      Filtering
                    </option>
                  </select>
                </label>

                <label className="flex items-center mt-5 gap-2">
                  <input
                    type="checkbox"
                    checked={testMode}
                    onChange={(e) =>
                      setTestMode(e.target.checked)
                    }
                  />
                  Test mode (relaxed filters, fallback bins)
                </label>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
