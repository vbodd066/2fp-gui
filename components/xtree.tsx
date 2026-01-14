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
  const [email, setEmail] = useState<string>("");

  async function runXTree() {
    if (!file) return;

    setStatus("running");
    setError(null);
    setResult(null);

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
    <div className="space-y-8 w-full">
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

      {/* information settings about XTree */}
      <div className="space-y-4 text-md">
        <p>
          XTree works by indexing reference genomes using a k-mer–based representation,
          allowing reads to be matched quickly even when the reference database is large,
          diverse, or incomplete. This makes it well suited for metagenomic, environmental,
          and mixed-domain datasets where standard alignment approaches may fail or become
          prohibitively expensive.
        </p>

        <p>
          This web interface provides access to a curated subset of XTree functionality
          intended for exploration, demonstration, and small-scale analyses. It is not
          a replacement for full local or HPC deployments, which offer additional tuning,
          batching, and performance options.
        </p>
      </div>

      {/* Instructions */}
      <div className="space-y-2 text-md mt-10">
        <p className="font-bold">How to use XTree</p>
        <ol className="list-decimal list-inside space-y-1 font-bold">
          <li>
            Upload a sequencing file in FASTA or FASTQ format containing one or more reads.
          </li>
          <li>
            Choose the appropriate reference database, read type, and sensitivity based
            on your data and analysis goals.
          </li>
          <li>
            Click <em>Run XTree</em> to begin alignment. Progress and results will appear
            once the job completes.
          </li>
        </ol>
      </div>

      {/* Defaults explanation */}
      <p className="text-sm text-secondary">
        By default, XTree runs using the GTDB reference database in short-read mode with
        standard sensitivity. These settings are appropriate for most Illumina-style
        metagenomic datasets and provide a balance between speed and alignment accuracy.
        For long-read data, alternative references, or maximum sensitivity, consider
        adjusting the settings or running XTree locally.
      </p>

      {/* Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 text-md">
        {/* Reference database */}
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

          <p className="text-sm text-secondary">
            The reference database defines which genomes XTree aligns reads against.
            Larger and more diverse databases increase biological coverage but may
            require additional computation.
          </p>

          <ul className="text-sm text-secondary list-disc list-inside space-y-1">
            <li>
              <strong>GTDB</strong>: Genome Taxonomy Database. A curated,
              phylogenetically consistent collection of bacterial and archaeal genomes.
              Recommended for most metagenomic and environmental datasets.
            </li>
            <li>
              <strong>RefSeq</strong>: NCBI Reference Sequence database. Broad coverage
              across many organism groups, including eukaryotes, but less
              taxonomically standardized.
            </li>
          </ul>
        </div>

        {/* Read type */}
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

          <p className="text-sm text-secondary">
            This setting controls how XTree interprets read length and error
            characteristics during alignment.
          </p>

          <ul className="text-sm text-secondary list-disc list-inside space-y-1">
            <li>
              <strong>Short reads</strong>: Optimized for Illumina-style sequencing
              data (typically 50–300 bp). This mode prioritizes speed and precision for
              high-depth datasets.
            </li>
            <li>
              <strong>Long reads</strong>: Designed for Oxford Nanopore or PacBio data,
              which have longer read lengths and higher error rates. Alignment is more
              tolerant but may require additional compute.
            </li>
          </ul>
        </div>

        {/* Sensitivity */}
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

          <p className="text-sm text-secondary">
            Sensitivity controls how aggressively XTree searches for potential matches
            between reads and reference sequences.
          </p>

          <ul className="text-sm text-secondary list-disc list-inside space-y-1">
            <li>
              <strong>Standard</strong>: Balanced mode that provides accurate alignments
              with faster runtimes. Recommended for most datasets and exploratory
              analyses.
            </li>
            <li>
              <strong>High sensitivity</strong>: Expands the search space to detect
              weaker or more divergent matches. Useful for low-abundance organisms or
              highly diverse samples, but increases runtime and memory usage.
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
          {file ? file.name : "Drag & drop FASTA / FASTQ"}
        </div>

        <label className="border p-6 text-center text-accent font-bold cursor-pointer">
          Browse files
          <input type="file" hidden accept=".fa,.fasta,.fq,.fastq,.gz" onChange={(e) => setFile(e.target.files?.[0] || null)} />
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
            Provide an email address to receive the results and a notification when your XTree job is complete.
          </p>
      </div>

      <button onClick={runXTree}
      disabled={!file || !email || status === "running"}
      className="bg-accent/80 px-4 py-2 text-black disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "running" ? "Running…" : "Submit XTree Job"}
      </button>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {result && <pre className="text-xs bg-(--color-codeBg) p-4">{result}</pre>}
    </div>
  );
}
