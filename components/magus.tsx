"use client";

import { useState } from "react";

export default function MAGUS() {
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] =
    useState<"eukaryote" | "balanced">("eukaryote");
  const [minContig, setMinContig] = useState<number>(1000);

  const [email, setEmail] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);

  async function submitMAGUS() {
    if (!file || !email) return;

    setSubmitting(true);
    setError(null);

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
      if (!res.ok) {
        throw new Error(data.error || "Job submission failed");
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave() {
    setIsDragging(false);
  }

  function clearFile() {
    setFile(null);
    setIsDragging(false);
  }

  return (
    <div className="space-y-8 w-full">
      <div className="flex justify-between border-b border-secondary/20 pb-3">
        <h3 className="text-lg font-semibold">
          MAGUS Metagenomic Workflow
        </h3>
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

      <div className="space-y-4 text-md">
        <p>
          MAGUS is designed for deeply sequenced, multi-domain metagenomic
          datasets, particularly those dominated by large or low-abundance
          eukaryotic genomes.
        </p>
        <p>
          This web interface exposes a simplified, demonstration-focused
          subset of MAGUS functionality.
        </p>
      </div>

      <div className="space-y-2 text-md mt-10">
        <p className="font-bold">How to use MAGUS</p>
        <ol className="list-decimal list-inside space-y-1 font-bold">
          <li>Upload a shotgun metagenomic FASTQ file.</li>
          <li>Select an analysis preset and minimum contig length.</li>
          <li>Submit the job and wait for results via email.</li>
        </ol>
      </div>

      <p className="text-sm text-secondary">
        By default, MAGUS runs in a eukaryote-dominant mode with a minimum
        contig length of 1000 bp.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 text-md">
        <div className="space-y-2">
          <label className="font-bold">Analysis preset</label>
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as any)}
            className="w-full border p-1 bg-transparent"
          >
            <option value="eukaryote">
              Eukaryote-dominant (default)
            </option>
            <option value="balanced">Balanced</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="font-bold">
            Minimum contig length (bp)
          </label>
          <input
            type="number"
            value={minContig}
            min={500}
            max={10000}
            onChange={(e) => setMinContig(Number(e.target.value))}
            className="w-full border p-1 bg-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`relative border border-dashed p-6 text-md font-bold text-center transition-colors
            ${
              file || isDragging
                ? "border-accent text-accent"
                : "border-secondary/40 text-secondary"
            }
          `}
        >
          {file && (
            <button
              onClick={clearFile}
              className="absolute top-2 right-2 text-accent hover:opacity-70"
              aria-label="Remove file"
            >
              ×
            </button>
          )}

          {file
            ? file.name
            : isDragging
            ? "Release to upload file"
            : "Drag & drop FASTQ"}
        </div>

        <label
          className={`border p-6 text-center font-bold cursor-pointer transition-colors
            ${
              file
                ? "border-accent text-accent"
                : "border-secondary/40 text-accent"
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

      <div className="space-y-2">
        <label className="font-bold">*Email address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-1 bg-transparent"
        />
        <p className="text-sm text-secondary">
          Results will be emailed once processing is complete.
        </p>
      </div>

      {!submitted ? (
        <>
          <button
            onClick={submitMAGUS}
            disabled={!file || !email || submitting}
            className="bg-accent/80 px-4 py-2 text-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting…" : "Submit MAGUS Job"}
          </button>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </>
      ) : (
        <div className="border border-green-500/60! p-4 rounded-md text-sm text-green-600!">
          <p className="font-semibold text-green-600!">
            Job submission successful
          </p>
          <p className="mt-1 text-green-500!">
            Your analysis has been queued. Results will be emailed to you once
            processing is complete.
          </p>
        </div>

      )}
    </div>
  );
}
