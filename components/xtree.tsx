"use client";

import { useState } from "react";

export default function XTree() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<
    "idle" | "running" | "error" | "done"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function runXTree() {
    if (!file) return;

    setStatus("running");
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/xtree", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "XTree failed");
      }

      setResult(data.result ?? "XTree completed successfully.");
      setStatus("done");
    } catch (err: any) {
      setError(err.message);
      setStatus("error");
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-secondary/20 pb-3">
        <h3 className="text-lg font-semibold">XTree Alignment</h3>
        <div className="flex gap-4 text-sm">
          <a
            href="https://doi.org/10.64898/2025.12.22.696015"
            target="_blank"
            className="text-accent hover:underline"
          >
            Manuscript
          </a>
          <a
            href="https://github.com/two-frontiers-project/2FP-XTree"
            target="_blank"
            className="text-accent hover:underline"
          >
            GitHub
          </a>
        </div>
      </div>

      {/* Upload */}
      <section className="space-y-2">
        <p className="font-medium">Upload sequencing data</p>

        <div className="grid grid-cols-2 gap-4 w-full">
          {/* Drop zone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="flex items-center justify-center rounded border border-dashed border-secondary/40 p-6 text-sm text-secondary"
          >
            {file ? file.name : "Drag & drop FASTA / FASTQ here"}
          </div>

          {/* Browse */}
          <div className="flex items-center justify-center rounded border border-secondary/30 p-6">
            <label className="cursor-pointer rounded bg-accent/80 px-4 py-2 text-sm font-medium text-black">
              Browse files
              <input
                type="file"
                accept=".fa,.fasta,.fq,.fastq,.gz"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>
        </div>
      </section>

      {/* Run */}
      <button
        disabled={!file || status === "running"}
        onClick={runXTree}
        className="rounded bg-accent/80 px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
      >
        {status === "running" ? "Running XTree…" : "Run XTree"}
      </button>

      {/* Status */}
      {error && (
        <p className="text-sm text-red-400">
          Error: {error}
        </p>
      )}

      {result && (
        <pre className="text-xs bg-(--color-codeBg) text-(--color-codeText) p-4 rounded">
          {result}
        </pre>
      )}
    </div>
  );
}
