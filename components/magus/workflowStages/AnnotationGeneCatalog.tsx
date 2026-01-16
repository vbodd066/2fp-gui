"use client";

import { useEffect, useState } from "react";

type Props = {
  enabled: boolean;
  onToggle: () => void;
  onChange: (config: any) => void;
};

export default function AnnotationGeneCatalog({
  enabled,
  onToggle,
  onChange,
}: Props) {
  /* -------------------- ORF calling -------------------- */

  const [callOrfs, setCallOrfs] = useState<boolean>(true);
  const [domain, setDomain] = useState<
    "bacterial" | "viral" | "eukaryotic" | "metagenomic"
  >("bacterial");

  /* -------------------- annotation -------------------- */

  const [annotate, setAnnotate] = useState<boolean>(true);
  const [domains, setDomains] = useState<string[]>(
    ["bacteria", "viruses", "metagenomes"]
  );

  /* -------------------- gene catalog -------------------- */

  const [buildCatalog, setBuildCatalog] = useState<boolean>(false);
  const [identityThreshold, setIdentityThreshold] =
    useState<number>(0.9);
  const [coverageThreshold, setCoverageThreshold] =
    useState<number>(0.8);

  /* -------------------- custom HMM mode -------------------- */

  const [useCustomHmm, setUseCustomHmm] =
    useState<boolean>(false);
  const [evalueFull, setEvalueFull] =
    useState<number>(1e-5);
  const [evalueDom, setEvalueDom] =
    useState<number>(1e-5);

  /* -------------------- resources -------------------- */

  const [threads, setThreads] = useState<number>(8);
  const [maxWorkers, setMaxWorkers] =
    useState<number>(4);

  /* -------------------- advanced -------------------- */

  const [showAdvanced, setShowAdvanced] =
    useState<boolean>(false);

  /* -------------------- propagate config -------------------- */

  useEffect(() => {
    onChange({
      orf_calling: {
        enabled: callOrfs,
        domain,
      },
      annotation: {
        enabled: annotate,
        domains,
        mode: useCustomHmm ? "custom" : "default",
        evalue_full: useCustomHmm ? evalueFull : null,
        evalue_dom: useCustomHmm ? evalueDom : null,
      },
      gene_catalog: {
        enabled: buildCatalog,
        identity_threshold: identityThreshold,
        coverage_threshold: coverageThreshold,
      },
      resources: {
        threads,
        max_workers: maxWorkers,
      },
    });
  }, [
    callOrfs,
    domain,
    annotate,
    domains,
    useCustomHmm,
    evalueFull,
    evalueDom,
    buildCatalog,
    identityThreshold,
    coverageThreshold,
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
                    text-secondary
                    transition-colors duration-150
                    hover:text-accent"
        >
          <input
            type="checkbox"
            checked={enabled}
            onChange={onToggle}
            className="mr-2"
          />
          Annotation & gene catalogs
        </label>

        <span className="text-sm text-secondary">
          Optional
        </span>
      </div>

      {!enabled && (
        <p className="text-sm text-secondary">
          Predict ORFs, annotate proteins, and optionally build a
          gene catalog.
        </p>
      )}

      {enabled && (
        <>
          {/* ORF calling */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={callOrfs}
                onChange={(e) =>
                  setCallOrfs(e.target.checked)
                }
              />
              Call ORFs
            </label>

            {callOrfs && (
              <label className="block">
                Domain
                <select
                  value={domain}
                  onChange={(e) =>
                    setDomain(
                      e.target.value as any
                    )
                  }
                  className="w-full border p-1 bg-transparent"
                >
                  <option value="bacterial">
                    Bacterial
                  </option>
                  <option value="viral">
                    Viral
                  </option>
                  <option value="eukaryotic">
                    Eukaryotic
                  </option>
                  <option value="metagenomic">
                    Metagenomic
                  </option>
                </select>
              </label>
            )}
          </div>

          {/* annotation */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={annotate}
                onChange={(e) =>
                  setAnnotate(e.target.checked)
                }
              />
              Annotate proteins
            </label>

            {annotate && (
              <>
                <label className="block">
                  Domains to annotate
                  <select
                    multiple
                    value={domains}
                    onChange={(e) =>
                      setDomains(
                        Array.from(
                          e.target.selectedOptions
                        ).map((o) => o.value)
                      )
                    }
                    className="w-full border p-1 bg-transparent"
                  >
                    <option value="bacteria">
                      Bacteria
                    </option>
                    <option value="viruses">
                      Viruses
                    </option>
                    <option value="metagenomes">
                      Metagenomes
                    </option>
                    <option value="eukaryotes">
                      Eukaryotes
                    </option>
                  </select>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useCustomHmm}
                    onChange={(e) =>
                      setUseCustomHmm(
                        e.target.checked
                      )
                    }
                  />
                  Use custom HMM database
                </label>
              </>
            )}
          </div>

          {/* gene catalog */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={buildCatalog}
                onChange={(e) =>
                  setBuildCatalog(
                    e.target.checked
                  )
                }
              />
              Build gene catalog
            </label>

            {buildCatalog && (
              <>
                <label className="block">
                  Identity threshold
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={1}
                    value={identityThreshold}
                    onChange={(e) =>
                      setIdentityThreshold(
                        Number(e.target.value)
                      )
                    }
                    className="w-full border p-1 bg-transparent"
                  />
                </label>

                <label className="block">
                  Coverage threshold
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    max={1}
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

          {/* advanced toggle */}
          {(annotate || buildCatalog) && (
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
              {useCustomHmm && (
                <>
                  <p className="font-bold">
                    Custom HMM thresholds
                  </p>

                  <label className="block">
                    Full sequence e-value
                    <input
                      type="number"
                      step="1e-6"
                      value={evalueFull}
                      onChange={(e) =>
                        setEvalueFull(
                          Number(e.target.value)
                        )
                      }
                      className="w-full border p-1 bg-transparent"
                    />
                  </label>

                  <label className="block">
                    Domain e-value
                    <input
                      type="number"
                      step="1e-6"
                      value={evalueDom}
                      onChange={(e) =>
                        setEvalueDom(
                          Number(e.target.value)
                        )
                      }
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
