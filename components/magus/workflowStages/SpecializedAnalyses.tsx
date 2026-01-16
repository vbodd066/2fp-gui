"use client";

import { useEffect, useState } from "react";

type Props = {
  enabled: boolean;
  onToggle: () => void;
  onChange: (config: any) => void;
};

export default function SpecializedAnalyses({
  enabled,
  onToggle,
  onChange,
}: Props) {
  /* -------------------- viruses -------------------- */

  const [findViruses, setFindViruses] = useState<boolean>(false);
  const [virusMinLength, setVirusMinLength] = useState<number>(500);
  const [virusQuality, setVirusQuality] = useState<string>("CHM");
  const [checkvDb, setCheckvDb] = useState<File | null>(null);

  /* -------------------- eukaryotes -------------------- */

  const [findEuks, setFindEuks] = useState<boolean>(false);
  const [eukSizeThreshold, setEukSizeThreshold] =
    useState<number>(10_000_000);
  const [skipEukRep, setSkipEukRep] = useState<boolean>(false);
  const [skipEukCC, setSkipEukCC] = useState<boolean>(false);
  const [eukccDb, setEukccDb] = useState<File | null>(null);

  /* -------------------- dereplication -------------------- */

  const [dereplicate, setDereplicate] = useState<boolean>(false);
  const [kmerSize, setKmerSize] = useState<number>(16);

  /* -------------------- resources -------------------- */

  const [threads, setThreads] = useState<number>(8);
  const [maxWorkers, setMaxWorkers] = useState<number>(1);

  /* -------------------- advanced -------------------- */

  const [showAdvanced, setShowAdvanced] =
    useState<boolean>(false);

  /* -------------------- propagate config -------------------- */

  useEffect(() => {
    onChange({
      viruses: {
        enabled: findViruses,
        min_length: virusMinLength,
        quality: virusQuality,
        has_checkv_db: Boolean(checkvDb),
      },
      eukaryotes: {
        enabled: findEuks,
        size_threshold: eukSizeThreshold,
        skip_eukrep: skipEukRep,
        skip_eukcc: skipEukCC,
        has_eukcc_db: Boolean(eukccDb),
      },
      dereplication: {
        enabled: dereplicate,
        kmer_size: kmerSize,
      },
      resources: {
        threads,
        max_workers: maxWorkers,
      },
    });
  }, [
    findViruses,
    virusMinLength,
    virusQuality,
    checkvDb,
    findEuks,
    eukSizeThreshold,
    skipEukRep,
    skipEukCC,
    eukccDb,
    dereplicate,
    kmerSize,
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
          Eukaryotes, viruses & specialized analyses
        </label>

        <span className="text-sm text-secondary">
          Optional
        </span>
      </div>

      {!enabled && (
        <p className="text-sm text-secondary">
          Recover viral genomes, eukaryotic bins, or dereplicate MAGs.
        </p>
      )}

      {enabled && (
        <>
          {/* viruses */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={findViruses}
                onChange={(e) =>
                  setFindViruses(e.target.checked)
                }
              />
              Find viruses
            </label>

            {findViruses && (
              <>
                <label className="block">
                  Minimum contig length
                  <input
                    type="number"
                    min={100}
                    value={virusMinLength}
                    onChange={(e) =>
                      setVirusMinLength(
                        Number(e.target.value)
                      )
                    }
                    className="w-full border p-1 bg-transparent"
                  />
                </label>

                <label className="block">
                  Quality tiers to retain
                  <select
                    value={virusQuality}
                    onChange={(e) =>
                      setVirusQuality(
                        e.target.value
                      )
                    }
                    className="w-full border p-1 bg-transparent"
                  >
                    <option value="CHM">
                      Complete / High / Medium
                    </option>
                    <option value="CH">
                      Complete / High
                    </option>
                    <option value="C">
                      Complete only
                    </option>
                  </select>
                </label>

                <label className="block">
                  CheckV database
                  <input
                    type="file"
                    onChange={(e) =>
                      setCheckvDb(
                        e.target.files?.[0] ||
                          null
                      )
                    }
                  />
                  {!checkvDb && (
                    <p className="text-sm text-secondary">
                      Required for virus detection
                    </p>
                  )}
                </label>
              </>
            )}
          </div>

          {/* eukaryotes */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={findEuks}
                onChange={(e) =>
                  setFindEuks(e.target.checked)
                }
              />
              Find eukaryotic bins
            </label>

            {findEuks && (
              <>
                <label className="block">
                  Minimum bin size (bp)
                  <input
                    type="number"
                    min={1_000_000}
                    value={eukSizeThreshold}
                    onChange={(e) =>
                      setEukSizeThreshold(
                        Number(e.target.value)
                      )
                    }
                    className="w-full border p-1 bg-transparent"
                  />
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={skipEukRep}
                    onChange={(e) =>
                      setSkipEukRep(
                        e.target.checked
                      )
                    }
                  />
                  Skip EukRep
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={skipEukCC}
                    onChange={(e) =>
                      setSkipEukCC(
                        e.target.checked
                      )
                    }
                  />
                  Skip EukCC
                </label>

                <label className="block">
                  EukCC database mapping
                  <input
                    type="file"
                    onChange={(e) =>
                      setEukccDb(
                        e.target.files?.[0] ||
                          null
                      )
                    }
                  />
                  {!eukccDb && (
                    <p className="text-sm text-secondary">
                      Required unless EukCC
                      is skipped
                    </p>
                  )}
                </label>
              </>
            )}
          </div>

          {/* dereplication */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={dereplicate}
                onChange={(e) =>
                  setDereplicate(
                    e.target.checked
                  )
                }
              />
              Dereplicate MAGs
            </label>

            {dereplicate && (
              <label className="block">
                K-mer size
                <input
                  type="number"
                  min={8}
                  value={kmerSize}
                  onChange={(e) =>
                    setKmerSize(
                      Number(e.target.value)
                    )
                  }
                  className="w-full border p-1 bg-transparent"
                />
              </label>
            )}
          </div>

          {/* advanced toggle */}
          {(findViruses ||
            findEuks ||
            dereplicate) && (
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

              <label className="block">
                Max parallel jobs
                <input
                  type="number"
                  min={1}
                  value={maxWorkers}
                  onChange={(e) =>
                    setMaxWorkers(
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
