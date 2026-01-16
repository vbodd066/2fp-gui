"use client";

import { useEffect, useState } from "react";

type Props = {
  enabled: boolean;
  onToggle: () => void;
  onChange: (config: any) => void;
  file: File | null;
  setFile: (f: File | null) => void;
};

export default function InputExecution({
  enabled,
  onToggle,
  onChange,
  file,
  setFile,
}: Props) {
  /* -------------------- local state -------------------- */

  const [mode, setMode] = useState<"local" | "slurm">("local");
  const [seqtype, setSeqtype] = useState<"short" | "long">("short");

  const [threads, setThreads] = useState<number>(8);
  const [maxWorkers, setMaxWorkers] = useState<number>(1);

  const [slurmConfig, setSlurmConfig] = useState<File | null>(null);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  /* -------------------- propagate config -------------------- */

  useEffect(() => {
    onChange({
      mode,
      seqtype,
      threads,
      max_workers: maxWorkers,
      has_slurm_config: Boolean(slurmConfig),
    });
  }, [mode, seqtype, threads, maxWorkers, slurmConfig]);

  /* -------------------- drag handlers -------------------- */

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave() {
    setIsDragging(false);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }

  function clearFile() {
    setFile(null);
    setIsDragging(false);
  }

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
          Input & Execution Mode
        </label>

        <span className="text-sm text-secondary">
          Required - Input Files
        </span>
      </div>

      {!enabled && (
        <p className="text-sm text-secondary">
          Upload sequencing data and configure how MAGUS runs.
        </p>
      )}

      {enabled && (
        <>
          {/* file upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* drag & drop */}
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`relative border border-dashed p-6 text-center font-bold
                          transition-colors rounded-lg
                ${
                  isDragging || file
                    ? "border-accent text-accent"
                    : "border-secondary/40 text-secondary"
                }
              `}
            >
              {file && (
                <button
                  onClick={clearFile}
                  className="absolute top-3 right-4
                            w-7 h-7
                            flex items-center justify-center
                            text-red-500 border border-red-500
                            rounded-full
                            transition hover:bg-red-500 hover:text-black"
                  aria-label="Remove file"
                >
                  ×
                </button>
              )}

              {file
                ? file.name
                : isDragging
                ? "Release to upload file"
                : "Drag & drop FASTQ (.fq, .fastq, .gz)"}
            </div>

            {/* browse */}
            <label
              className={`border p-6 text-center font-bold cursor-pointer
                          transition
                          rounded-lg
                          hover:scale-[1.02]
                ${
                  file
                    ? "border-accent text-accent"
                    : "border-secondary/40 text-accent hover:border-accent hover:text-foreground"
                }
              `}
            >
              {file ? "File selected" : "Browse files"}
              <input
                type="file"
                hidden
                accept=".fq,.fastq,.gz"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          {/* basic settings */}
          <div className="space-y-4">
            <p className="font-bold">Basic settings</p>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                Execution mode
                <select
                  value={mode}
                  onChange={(e) =>
                    setMode(e.target.value as any)
                  }
                  className="w-full border p-1 h-8 bg-transparent"
                >
                  <option value="local">Local</option>
                  <option value="slurm">Slurm</option>
                </select>
              </label>

              <label className="block">
                Read type
                <select
                  value={seqtype}
                  onChange={(e) =>
                    setSeqtype(e.target.value as any)
                  }
                  className="w-full border p-1 h-8 bg-transparent"
                >
                  <option value="short">Short reads</option>
                  <option value="long">Long reads</option>
                </select>
              </label>
            </div>
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
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  Threads per job
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
              {mode === "slurm" && (
                <label className="block">
                  Slurm config TSV
                  <input
                    type="file"
                    accept=".tsv,.txt"
                    onChange={(e) =>
                      setSlurmConfig(
                        e.target.files?.[0] || null
                      )
                    }
                  />
                  {slurmConfig && (
                    <p className="text-sm text-secondary mt-1">
                      {slurmConfig.name}
                    </p>
                  )}
                </label>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
