"use client";

import { useState } from "react";

export default function XTree() {
  const [file, setFile] = useState<File | null>(null);
  const [db, setDb] = useState<"gtdb" | "refseq">("gtdb");
  const [readType, setReadType] = useState<"short" | "long">("short");
  const [sensitivity, setSensitivity] = useState<"standard" | "high">("standard");

  const [status, setStatus] = useState<"idle" | "running" | "error" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function runXTree() {
    if (!file) return;

    setStatus("running");
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "params",
      JSON.stringify({ db, readType, sensitivity })
    );

    try {
      const res = await fetch("/api/xtree", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "XTree failed");

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
    <div className="space-y-8 max-w-3xl">
      <div className="flex justify-between border-b border-secondary/20 pb-3">
        <h3 className="text-lg font-semibold">XTree Alignment</h3>
        <div className="flex gap-4 text-sm">
          <a href="https://doi.org/10.64898/2025.12.22.696015" target="_blank" className="text-accent hover:underline">
            Manuscript
          </a>
          <a href="https://github.com/two-frontiers-project/2FP-XTree" target="_blank" className="text-accent hover:underline">
            GitHub
          </a>
        </div>
      </div>

      <p className="text-sm">
        Memory-efficient alignment of short and long reads against large,
        multi-domain reference databases.
      </p>

      <div className="space-y-2 text-sm">
        <p className="font-medium">Instructions</p>
        <ol className="list-decimal list-inside space-y-1 text-secondary">
          <li>Select a FASTA or FASTQ file</li>
          <li>Adjust settings if needed</li>
          <li>Click Run XTree</li>
        </ol>
      </div>

      <p className="text-xs text-secondary">
        Default settings: GTDB database, short-read mode, standard sensitivity.
      </p>

      {/* Settings */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <label>Reference DB</label>
          <select value={db} onChange={(e) => setDb(e.target.value as any)} className="w-full border p-1 bg-transparent">
            <option value="gtdb">GTDB (default)</option>
            <option value="refseq">RefSeq</option>
          </select>
        </div>

        <div>
          <label>Read type</label>
          <select value={readType} onChange={(e) => setReadType(e.target.value as any)} className="w-full border p-1 bg-transparent">
            <option value="short">Short (default)</option>
            <option value="long">Long</option>
          </select>
        </div>

        <div>
          <label>Sensitivity</label>
          <select value={sensitivity} onChange={(e) => setSensitivity(e.target.value as any)} className="w-full border p-1 bg-transparent">
            <option value="standard">Standard (default)</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      {/* Upload */}
      <div className="grid grid-cols-2 gap-4">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="border border-dashed p-6 text-sm text-center"
        >
          {file ? file.name : "Drag & drop FASTA / FASTQ"}
        </div>

        <label className="border p-6 text-center cursor-pointer">
          Browse files
          <input type="file" hidden accept=".fa,.fasta,.fq,.fastq,.gz" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
      </div>

      <button onClick={runXTree} disabled={!file || status === "running"} className="bg-accent/80 px-4 py-2 text-black">
        {status === "running" ? "Running…" : "Run XTree"}
      </button>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {result && <pre className="text-xs bg-(--color-codeBg) p-4">{result}</pre>}
    </div>
  );
}
