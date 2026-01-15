"use client";

import { useState } from "react";

export default function XTree() {
  const [file, setFile] = useState<File | null>(null);
  const [db, setDb] = useState<"gtdb" | "refseq">("gtdb");
  const [readType, setReadType] = useState<"short" | "long">("short");
  const [sensitivity, setSensitivity] = useState<"standard" | "high">("standard");

  const [email, setEmail] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
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

      {/* Information */}
      <div className="space-y-4 text-md">
        <p>
          XTree works by indexing reference genomes using a k-mer–based representation,
          allowing reads to be matched quickly even when the reference database is large,
          diverse, or incomplete. This makes it well suited for metagenomic,
          environmental, and mixed-domain datasets.
        </p>

        <p>
          This web interface exposes a demonstration-focused subset of XTree
          functionality. For large datasets, custom parameters, or batch analyses,
          we recommend running XTree locally or on HPC infrastructure.
        </p>
      </div>

      {/* Instructions */}
      <div className="space-y-2 text-md mt-10">
        <p className="font-bold">How to use XTree</p>
        <ol className="list-decimal list-inside space-y-1 font-bold">
          <li>Upload a sequencing file in FASTA or FASTQ format.</li>
          <li>Select a reference database and alignment parameters.</li>
          <li>Submit the job and wait for results via email.</li>
        </ol>
      </div>

      {/* Defaults */}
      <p className="text-sm text-secondary">
        By default, XTree runs against the GTDB reference database in short-read mode
        with standard sensitivity. These settings are appropriate for most Illumina-style
        metagenomic datasets.
      </p>

      {/* Settings */}
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

      {/* Upload */}
      <div className="grid grid-cols-2 gap-4">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="border border-dashed p-6 text-md font-bold text-center"
        >
          {file ? file.name : "Drag & drop FASTA / FASTQ"}
        </div>

        <label className="border p-6 text-center text-accent font-bold cursor-pointer">
          Browse files
          <input
            type="file"
            hidden
            accept=".fa,.fasta,.fq,.fastq,.gz"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <label className="font-bold">*Email address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-1 bg-transparent"
        />
        <p className="text-sm text-secondary">
          Results and a notification will be sent to this address once processing is complete.
        </p>
      </div>

      {/* Submit / Confirmation */}
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
          <p className="font-semibold">
            Job submission successful
          </p>
          <p className="text-secondary mt-1">
            Your analysis has been queued. Results will be emailed to you once processing
            is complete.
          </p>
        </div>
      )}
    </div>
  );
}
