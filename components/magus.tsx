"use client";

import { useState } from "react";

export default function MAGUS() {
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<"eukaryote" | "balanced">("eukaryote");
  const [minContig, setMinContig] = useState(1000);

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
    formData.append("params", JSON.stringify({ preset, minContig }));

    try {
      const res = await fetch("/api/magus", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "MAGUS failed");

      setResult(data.result);
      setStatus("done");
    } catch (err: any) {
      setError(err.message);
      setStatus("error");
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex justify-between border-b pb-3">
        <h3 className="text-lg font-semibold">MAGUS Workflow</h3>
        <div className="flex gap-4 text-sm">
          <a href="https://doi.org/10.64898/2025.12.22.696022" target="_blank" className="text-accent hover:underline">
            Manuscript
          </a>
          <a href="https://github.com/two-frontiers-project/2FP_MAGUS" target="_blank" className="text-accent hover:underline">
            GitHub
          </a>
        </div>
      </div>

      <p className="text-sm">
        Modular metagenomic workflows optimized for low-abundance,
        multi-domain datasets.
      </p>

      <p className="text-xs text-secondary">
        Default settings: eukaryote-dominant preset, 1000 bp minimum contig.
      </p>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <label>Preset</label>
          <select value={preset} onChange={(e) => setPreset(e.target.value as any)} className="w-full border p-1 bg-transparent">
            <option value="eukaryote">Eukaryote-dominant (default)</option>
            <option value="balanced">Balanced</option>
          </select>
        </div>

        <div>
          <label>Min contig length (bp)</label>
          <input type="number" value={minContig} min={500} max={10000} onChange={(e) => setMinContig(Number(e.target.value))} className="w-full border p-1 bg-transparent" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border border-dashed p-6 text-center">
          {file ? file.name : "Drag & drop FASTQ"}
        </div>

        <label className="border p-6 text-center cursor-pointer">
          Browse files
          <input type="file" hidden accept=".fq,.fastq,.gz" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
      </div>

      <button onClick={runMAGUS} disabled={!file || status === "running"} className="bg-accent/80 px-4 py-2 text-black">
        {status === "running" ? "Running…" : "Run MAGUS"}
      </button>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {result && <pre className="text-xs bg-(--color-codeBg) p-4">{result}</pre>}
    </div>
  );
}
