"use client";

import { useState } from "react";

export default function MAGUS() {
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<"eukaryote" | "balanced">("eukaryote");
  const [minContig, setMinContig] = useState<number>(1000);
  const [email, setEmail] = useState<string>("");

  const [status, setStatus] = useState<"idle" | "running" | "error" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function runMAGUS() {
    if (!file) return;

    setStatus("running");
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("email", email);
    formData.append(
      "params",
      JSON.stringify({ preset, minContig })
    );

    try {
      const res = await fetch("/api/magus", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "MAGUS failed");

      setResult(data.result);
      setStatus("done");
    } catch (err: any) {
      setError(err.message);
      setStatus("error");
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }

  return (
    <div className="space-y-8 w-full">
      <div className="flex justify-between border-b border-secondary/20 pb-3">
        <h3 className="text-lg font-semibold">MAGUS Metagenomic Workflow</h3>
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

      {/* Information about MAGUS */}
      <div className="space-y-4 text-md">

        <p>
          MAGUS is particularly well suited for datasets dominated by large or
          low-abundance genomes, such as microbial eukaryotes, symbionts, and
          environmental samples where reference-based approaches alone may miss
          important biological signal.
        </p>

        <p>
          Rather than enforcing a rigid pipeline, MAGUS provides interoperable
          components that allow workflows to adapt as data complexity and sequencing
          depth increase. This web interface exposes a simplified, demonstration-focused
          subset of that functionality.
        </p>
      </div>

      {/* Instructions */}
      <div className="space-y-2 text-md mt-10">
        <p className="font-bold">How to use MAGUS</p>
        <ol className="list-decimal list-inside space-y-1 font-bold">
          <li>
            Upload a shotgun metagenomic FASTQ file containing sequencing reads
            from a mixed biological sample.
          </li>
          <li>
            Select an analysis preset and minimum contig length appropriate for
            your dataset.
          </li>
          <li>
            Click <em>Run MAGUS</em> to begin the workflow. Assembly and filtering
            steps will run automatically.
          </li>
        </ol>
      </div>

      {/* Defaults explanation */}
      <p className="text-sm text-secondary">
        By default, MAGUS runs using a eukaryote-dominant analysis preset with a
        minimum contig length of 1000 bp. These settings are intended to favor the
        recovery of larger, low-abundance genomes while maintaining conservative
        filtering. Full workflows with additional stages and tuning are available
        via local or HPC deployments.
      </p>

      {/* Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 text-md">
        {/* Preset */}
        <div className="space-y-2">
          <label className="font-bold">Analysis preset</label>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as any)}
            className="w-full border p-1 bg-transparent"
          >
            <option value="eukaryote">Eukaryote-dominant (default)</option>
            <option value="balanced">Balanced</option>
          </select>

          <p className="text-sm text-secondary">
            Presets control how MAGUS balances sensitivity across different domains
            of life during assembly and filtering.
          </p>

          <ul className="text-sm text-secondary list-disc list-inside space-y-1">
            <li>
              <strong>Eukaryote-dominant</strong>: Optimized for datasets where large
              eukaryotic genomes or symbionts are expected but may be present at low
              abundance. Assembly and filtering steps are tuned to preserve longer
              contigs.
            </li>
            <li>
              <strong>Balanced</strong>: Provides a more even trade-off between
              bacterial, archaeal, and eukaryotic signal. Suitable for general
              environmental or host-associated microbiomes.
            </li>
          </ul>
        </div>

        {/* Min contig */}
        <div className="space-y-2">
          <label className="font-bold">Minimum contig length (bp)</label>
          <input
            type="number"
            value={minContig}
            min={500}
            max={10000}
            onChange={(e) => setMinContig(Number(e.target.value))}
            className="w-full border p-1 bg-transparent"
          />

          <p className="text-sm text-secondary">
            This setting controls the minimum length of assembled contigs retained
            for downstream analysis.
          </p>

          <ul className="text-sm text-secondary list-disc list-inside space-y-1">
            <li>
              Higher thresholds (e.g. ≥1000 bp) reduce noise and favor more
              confidently assembled genomic fragments.
            </li>
            <li>
              Lower thresholds retain shorter contigs, which may be useful for
              shallow datasets but can increase false positives and fragmentation.
            </li>
          </ul>
        </div>
      </div>

      {/* Upload */}
      <div className="grid grid-cols-2 gap-4">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="border border-dashed p-6 text-md font-bold text-center"
        >
          {file ? file.name : "Drag & drop FASTQ"}
        </div>

        <label className="border p-6 text-center text-accent font-bold cursor-pointer">
          Browse files
          <input
            type="file"
            hidden
            accept=".fq,.fastq,.gz"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
      </div>


      <div className="space-y-2">
          <label className="font-bold">*Email address:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-1 bg-transparent"
          />
          <p className="text-sm text-secondary">
            Provide an email address to receive the results and a notification when your MAGUS job is complete.
          </p>
      </div>

      <button
        onClick={runMAGUS}
        disabled={!file || !email || status === "running"}
        className="bg-accent/80 px-4 py-2 text-black disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "running" ? "Running…" : "Submit MAGUS Job"}
      </button>


      {error && <p className="text-red-400 text-sm">{error}</p>}
      {result && <pre className="text-xs bg-(--color-codeBg) p-4">{result}</pre>}
    </div>
  );
}
