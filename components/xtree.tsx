"use client";

import { useMemo, useState } from "react";

type Mode = "ALIGN" | "BUILD";

export default function XTree() {
  /* -------------------- core state -------------------- */
  const [mode, setMode] = useState<Mode>("ALIGN");

  const [seqFile, setSeqFile] = useState<File | null>(null);
  const [mapFile, setMapFile] = useState<File | null>(null);

  const [email, setEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDraggingSeq, setIsDraggingSeq] = useState(false);
  const [isDraggingMap, setIsDraggingMap] = useState(false);


/* -------------------- drag handlers -------------------- */
function onSeqDragOver(e: React.DragEvent<HTMLDivElement>) {
  e.preventDefault();
  setIsDraggingSeq(true);
}

function onSeqDragLeave() {
  setIsDraggingSeq(false);
}

function onSeqDrop(e: React.DragEvent<HTMLDivElement>) {
  e.preventDefault();
  setIsDraggingSeq(false);
  const file = e.dataTransfer.files?.[0];
  if (file) setSeqFile(file);
}

function onMapDragOver(e: React.DragEvent<HTMLDivElement>) {
  e.preventDefault();
  setIsDraggingMap(true);
}

function onMapDragLeave() {
  setIsDraggingMap(false);
}

function onMapDrop(e: React.DragEvent<HTMLDivElement>) {
  e.preventDefault();
  setIsDraggingMap(false);
  const file = e.dataTransfer.files?.[0];
  if (file) setMapFile(file);
}


  /* -------------------- global options -------------------- */
  const [threads, setThreads] = useState<number>(8);
  const [logOut, setLogOut] = useState("");

  /* -------------------- ALIGN options -------------------- */
  const [db, setDb] = useState<"gtdb" | "refseq">("gtdb");
  const [confidence, setConfidence] = useState<number>(0.6);

  const [outPerq, setOutPerq] = useState(false);
  const [outRef, setOutRef] = useState(false);
  const [outTax, setOutTax] = useState(true);
  const [outCov, setOutCov] = useState(false);
  const [outOrthog, setOutOrthog] = useState(false);

  const [redistribute, setRedistribute] = useState(false);
  const [fastRedistribute, setFastRedistribute] = useState(false);
  const [shallowLca, setShallowLca] = useState(false);

  const [copyMem, setCopyMem] = useState(false);
  const [doForage, setDoForage] = useState(false);
  const [halfForage, setHalfForage] = useState(false);
  const [noAdamantium, setNoAdamantium] = useState(false);

  /* -------------------- BUILD options -------------------- */
  const [comp, setComp] = useState<0 | 1 | 2>(1);
  const [kmer, setKmer] = useState<number>(31);

  /* -------------------- command preview -------------------- */
  const commandPreview = useMemo(() => {
    const cmd: string[] = ["xtree", mode];

    if (seqFile) cmd.push("--seqs <input>");
    if (logOut) cmd.push(`--log-out ${logOut}`);
    if (threads) cmd.push(`--threads ${threads}`);

    if (mode === "ALIGN") {
      cmd.push(`--db ${db}`);
      cmd.push(`--confidence ${confidence}`);

      if (outPerq) cmd.push("--perq-out per_query.tsv");
      if (outRef) cmd.push("--ref-out reference.tsv");
      if (outTax) cmd.push("--tax-out taxonomy.tsv");
      if (outCov) cmd.push("--cov-out coverage.tsv");
      if (outOrthog) cmd.push("--orthog-out orthogonal.tsv");

      if (redistribute) cmd.push("--redistribute");
      if (fastRedistribute) cmd.push("--fast-redistribute");
      if (shallowLca) cmd.push("--shallow-lca");

      if (copyMem) cmd.push("--copymem");
      if (doForage) cmd.push("--doforage");
      if (halfForage) cmd.push("--half-forage");
      if (noAdamantium) cmd.push("--no-adamantium");
    }

    if (mode === "BUILD") {
      if (mapFile) cmd.push("--map <taxonomy.map>");
      cmd.push(`--comp ${comp}`);
      cmd.push(`--k ${kmer}`);
      cmd.push("--db <output.db>");
    }

    return cmd.join(" ");
  }, [
    mode,
    seqFile,
    mapFile,
    logOut,
    threads,
    db,
    confidence,
    outPerq,
    outRef,
    outTax,
    outCov,
    outOrthog,
    redistribute,
    fastRedistribute,
    shallowLca,
    copyMem,
    doForage,
    halfForage,
    noAdamantium,
    comp,
    kmer,
  ]);

  /* -------------------- submit -------------------- */
  async function submitXTree() {
    if (!seqFile || !email) return;

    setSubmitting(true);
    setError(null);

    const params = {
      mode,
      global: {
        threads,
        logOut,
      },
      align:
        mode === "ALIGN"
          ? {
              db,
              confidence,
              outputs: {
                perq: outPerq,
                ref: outRef,
                tax: outTax,
                cov: outCov,
                orthog: outOrthog,
              },
              algorithms: {
                redistribute,
                fastRedistribute,
                shallowLca,
              },
              performance: {
                copyMem,
                doForage,
                halfForage,
                noAdamantium,
              },
            }
          : undefined,
      build:
        mode === "BUILD"
          ? {
              comp,
              k: kmer,
              hasMap: Boolean(mapFile),
            }
          : undefined,
    };

    const formData = new FormData();
    formData.append("file", seqFile);
    if (mapFile) formData.append("mapFile", mapFile);
    formData.append("email", email);
    formData.append("params", JSON.stringify(params));

    try {
      const res = await fetch("/api/xtree", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  /* -------------------- render -------------------- */
  return (
    <div className="space-y-8 w-full">
      <h3 className="text-lg font-semibold">XTree Web Interface</h3>

      {/* mode selector */}
      <div className="flex gap-4">
        <button
          onClick={() => setMode("ALIGN")}
          className={mode === "ALIGN" ? "text-accent font-bold" : ""}
        >
          ALIGN
        </button>
        <button
          onClick={() => setMode("BUILD")}
          className={mode === "BUILD" ? "text-accent font-bold" : ""}
        >
          BUILD
        </button>
      </div>

      {/* file upload */}
      <div className="grid grid-cols-2 gap-4">
        {/* sequence drag & drop */}
        <div
          onDragOver={onSeqDragOver}
          onDragLeave={onSeqDragLeave}
          onDrop={onSeqDrop}
          className={`relative border border-dashed p-6 text-center font-bold transition-colors
            ${
              isDraggingSeq || seqFile
                ? "border-accent text-accent"
                : "border-secondary/40 text-secondary"
            }
          `}
        >
          {seqFile && (
            <button
              onClick={() => setSeqFile(null)}
              className="absolute top-2 right-2 text-accent hover:opacity-70"
              aria-label="Remove sequence file"
            >
              ×
            </button>
          )}

          {seqFile
            ? seqFile.name
            : isDraggingSeq
            ? "Release to upload file"
            : "Drag & drop FASTA / FASTQ"}
        </div>

        {/* sequence browse */}
        <label
          className={`border p-6 text-center font-bold cursor-pointer transition-colors
            ${
              seqFile
                ? "border-accent text-accent"
                : "border-secondary/40 text-accent"
            }
          `}
        >
          {seqFile ? "File selected" : "Browse files"}
          <input
            type="file"
            hidden
            accept=".fa,.fasta,.fq,.fastq,.gz"
            onChange={(e) => setSeqFile(e.target.files?.[0] || null)}
          />
        </label>
      </div>

      {mode === "BUILD" && (
        <div className="grid grid-cols-2 gap-4">
          {/* map drag & drop */}
          <div
            onDragOver={onMapDragOver}
            onDragLeave={onMapDragLeave}
            onDrop={onMapDrop}
            className={`relative border border-dashed p-6 text-center font-bold transition-colors
              ${
                isDraggingMap || mapFile
                  ? "border-accent text-accent"
                  : "border-secondary/40 text-secondary"
              }
            `}
          >
            {mapFile && (
              <button
                onClick={() => setMapFile(null)}
                className="absolute top-2 right-2 text-accent hover:opacity-70"
                aria-label="Remove map file"
              >
                ×
              </button>
            )}

            {mapFile
              ? mapFile.name
              : isDraggingMap
              ? "Release to upload taxonomy map"
              : "Drag & drop taxonomy map (--map)"}
          </div>

          {/* map browse */}
          <label
            className={`border p-6 text-center font-bold cursor-pointer transition-colors
              ${
                mapFile
                  ? "border-accent text-accent"
                  : "border-secondary/40 text-accent"
              }
            `}
          >
            {mapFile ? "Map file selected" : "Browse map file"}
            <input
              type="file"
              hidden
              onChange={(e) => setMapFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>

    )}



      {/* basic settings */}
      <div className="space-y-4">
        <p className="font-bold">Basic settings</p>

        {mode === "ALIGN" && (
          <>
            <label className="block">
              Database
              <select
                value={db}
                onChange={(e) => setDb(e.target.value as any)}
                className="w-full border p-1 bg-transparent"
              >
                <option value="gtdb">GTDB</option>
                <option value="refseq">RefSeq</option>
              </select>
            </label>

            <label className="block">
              Confidence threshold
              <input
                type="number"
                step="0.01"
                value={confidence}
                onChange={(e) => setConfidence(Number(e.target.value))}
                className="w-full border p-1 bg-transparent"
              />
            </label>
          </>
        )}

        {mode === "BUILD" && (
          <>
            <label className="block">
              k-mer size
              <input
                type="number"
                value={kmer}
                onChange={(e) => setKmer(Number(e.target.value))}
                className="w-full border p-1 bg-transparent"
              />
            </label>

            <label className="block">
              Compression level
              <select
                value={comp}
                onChange={(e) => setComp(Number(e.target.value) as any)}
                className="w-full border p-1 bg-transparent"
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
            </label>
          </>
        )}
      </div>

      {/* advanced */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-accent"
        >
          {showAdvanced ? "Hide advanced settings" : "Show advanced settings"}
        </button>

        {showAdvanced && (
          <div className="space-y-4 mt-4">
            <label className="block">
              Threads
              <input
                type="number"
                value={threads}
                onChange={(e) => setThreads(Number(e.target.value))}
                className="w-full border p-1 bg-transparent"
              />
            </label>

            <label className="block">
              Log output file
              <input
                type="text"
                value={logOut}
                onChange={(e) => setLogOut(e.target.value)}
                className="w-full border p-1 bg-transparent"
              />
            </label>

            {mode === "ALIGN" && (
              <>
                <p className="font-bold">Outputs</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={outPerq}
                      onChange={e => setOutPerq(e.target.checked)}
                    />
                    <span>Per-query</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={outRef}
                      onChange={e => setOutRef(e.target.checked)}
                    />
                    <span>Reference</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={outTax}
                      onChange={e => setOutTax(e.target.checked)}
                    />
                    <span>Taxonomy</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={outCov}
                      onChange={e => setOutCov(e.target.checked)}
                    />
                    <span>Coverage</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={outOrthog}
                      onChange={e => setOutOrthog(e.target.checked)}
                    />
                    <span>Orthogonal</span>
                  </label>
                </div>

                <p className="font-bold mt-4">Algorithms</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={redistribute}
                      onChange={e => setRedistribute(e.target.checked)}
                    />
                    <span>Redistribute</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={fastRedistribute}
                      onChange={e => setFastRedistribute(e.target.checked)}
                    />
                    <span>Fast redistribute</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={shallowLca}
                      onChange={e => setShallowLca(e.target.checked)}
                    />
                    <span>Shallow LCA</span>
                  </label>
                </div>

                <p className="font-bold mt-4">Performance</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={copyMem}
                      onChange={e => setCopyMem(e.target.checked)}
                    />
                    <span>Copy DB to memory</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={doForage}
                      onChange={e => setDoForage(e.target.checked)}
                    />
                    <span>Do forage</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={halfForage}
                      onChange={e => setHalfForage(e.target.checked)}
                    />
                    <span>Half forage</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={noAdamantium}
                      onChange={e => setNoAdamantium(e.target.checked)}
                    />
                    <span>Disable adamantium</span>
                  </label>
                </div>
              </>
            )}

          </div>
        )}
      </div>

      {/* command preview */}
      <div className="border p-3 text-sm font-mono bg-black/40">
        {commandPreview}
      </div>

      {/* email + submit */}
      <label className="block">
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-1 bg-transparent"
        />
      </label>

      {!submitted ? (
        <>
          <button
            onClick={submitXTree}
            disabled={!seqFile || !email || submitting}
            className="bg-accent px-4 py-2 text-black"
          >
            {submitting ? "Submitting…" : "Submit XTree job"}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </>
      ) : (
        <p className="text-green-500">Job submitted successfully.</p>
      )}
    </div>
  );
}
