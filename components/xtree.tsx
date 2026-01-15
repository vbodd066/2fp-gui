"use client";

import { useState } from "react";

export default function XTree() {
  const [file, setFile] = useState<File | null>(null);
  const [db, setDb] = useState<"gtdb" | "refseq">("gtdb");
  const [readType, setReadType] = useState<"short" | "long">("short");
  const [sensitivity, setSensitivity] =
    useState<"standard" | "high">("standard");

  const [email, setEmail] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);

  async function submitXTree() {
    if (!file || !email) return;

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("email", email);
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

      <div className="space-y-4 text-md">
        <p>
          XTree works by indexing reference genomes using a k-mer–based
          representation, allowing reads to be matched quickly even when the
          reference database is large, diverse, or incomplete.
        </p>
        <p>
          This web interface exposes a demonstration-focused subset of XTree
          functionality. For large datasets, run XTree locally or on HPC
          infrastructure.
        </p>
      </div>

      <div className="space-y-2 text-md mt-10">
        <p className="font-bold">How to use XTree</p>
        <ol className="list-decimal list-inside space-y-1 font-bold">
          <li>Upload a sequencing file in FASTA or FASTQ format.</li>
          <li>Select a reference database and alignment parameters.</li>
          <li>Submit the job and wait for results via email.</li>
        </ol>
      </div>

      <p className="text-sm text-secondary">
        By default, XTree runs against the GTDB reference database in short-read
        mode with standard sensitivity.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 text-md">
        <div className="space-y-2">
          <label className="font-bold">Reference database</label>
          <select
            value={db}
            onChange={(e) => setDb(e.target.value as any)}
            className="w-full border p-1 bg-transparent"
          >
            <option value="gtdb">GTDB (default)</option>
            <option value="refseq">RefSeq</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="font-bold">Read type</label>
          <select
            value={readType}
            onChange={(e) => setReadType(e.target.value as any)}
            className="w-full border p-1 bg-transparent"
          >
            <option value="short">Short reads (default)</option>
            <option value="long">Long reads</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="font-bold">Alignment sensitivity</label>
          <select
            value={sensitivity}
            onChange={(e) => setSensitivity(e.target.value as any)}
            className="w-full border p-1 bg-transparent"
          >
            <option value="standard">Standard (default)</option>
            <option value="high">High sensitivity</option>
          </select>
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
            : "Drag & drop FASTA / FASTQ"}
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
            accept=".fa,.fasta,.fq,.fastq,.gz"
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
          Results will be sent to this address once processing is complete.
        </p>
      </div>

      {!submitted ? (
        <>
          <button
            onClick={submitXTree}
            disabled={!file || !email || submitting}
            className="bg-accent/80 px-4 py-2 text-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting…" : "Submit XTree Job"}
          </button>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </>
      ) : (
        <div className="border border-secondary/30 p-4 rounded-md text-sm">
          <p className="font-semibold">Job submission successful</p>
          <p className="text-secondary mt-1">
            Your analysis has been queued. Results will be emailed to you once
            processing is complete.
          </p>
        </div>
      )}
    </div>
  );
}
