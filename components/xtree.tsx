/* ============================================================
 * XTree — simplified direct-execution interface
 * ============================================================
 * Refactored per PRD §5.4:
 *  - Email field removed (results shown in-app)
 *  - Job queue removed (direct SSE streaming)
 *  - Live stdout/stderr output during execution
 *  - Downloadable output files after completion
 *
 * Integration point: POST /api/xtree/run (SSE stream)
 * ============================================================ */

"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { HelpCircle, X, Download } from "lucide-react";
import { useSSE } from "@/hooks/useSSE";
import type { XTreeStatus } from "@/lib/types/xtree";


type Mode = "ALIGN" | "BUILD";

export default function XTree() {
  /* -------------------- core state -------------------- */
  const [mode, setMode] = useState<Mode>("ALIGN");

  const [seqFile, setSeqFile] = useState<File | null>(null);
  const [mapFile, setMapFile] = useState<File | null>(null);

  /* Email removed — PRD §5.2 / §7.1 */

  const [status, setStatus] = useState<XTreeStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  /* ---- streaming output state ---- */
  const [stdout, setStdout] = useState("");
  const [stderr, setStderr] = useState("");
  const [outputFiles, setOutputFiles] = useState<string[]>([]);
  const outputRef = useRef<HTMLPreElement>(null);

  const { start, abort, isStreaming } = useSSE();

  /* ---- auto-scroll output ---- */
  useEffect(() => {
    if (status === "running" && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [stdout, stderr, status]);

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

  /* -------------------- execute via SSE -------------------- */
  function runXTree() {
    if (!seqFile) return;

    // Reset output state
    setStatus("running");
    setError(null);
    setStdout("");
    setStderr("");
    setOutputFiles([]);

    const params = {
      mode,
      global: { threads, logOut },
      align:
        mode === "ALIGN"
          ? {
              db,
              confidence,
              outputs: { perq: outPerq, ref: outRef, tax: outTax, cov: outCov, orthog: outOrthog },
              algorithms: { redistribute, fastRedistribute, shallowLca },
              performance: { copyMem, doForage, halfForage, noAdamantium },
            }
          : undefined,
      build:
        mode === "BUILD"
          ? { comp, k: kmer, hasMap: Boolean(mapFile) }
          : undefined,
    };

    const formData = new FormData();
    formData.append("file", seqFile);
    if (mapFile) formData.append("mapFile", mapFile);
    formData.append("params", JSON.stringify(params));

    start({
      url: "/api/xtree/run",
      body: formData,
      callbacks: {
        onEvent(event, data) {
          switch (event) {
            case "stdout":
              setStdout((prev) => prev + data.line + "\n");
              break;
            case "stderr":
              setStderr((prev) => prev + data.line + "\n");
              break;
            case "status":
              setStatus(data.status);
              if (data.outputFiles) setOutputFiles(data.outputFiles);
              if (data.error) setError(data.error);
              break;
          }
        },
        onDone() {
          if (status === "running") setStatus("success");
        },
        onError(err) {
          setStatus("error");
          setError(err.message);
        },
      },
    });
  }

  /* -------------------- render -------------------- */
  return (
    <div className="space-y-8 w-full">
      <div className="flex justify-between pb-3">

        {/* header */}
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold">XTree Workflow</h3>

          <div className="relative group">
            <button
              type="button"
              className="text-secondary hover:text-accent transition"
              aria-label="About XTree"
            >
              <HelpCircle size={20} />
            </button>

            <div className="absolute hidden group-hover:block
                            bg-black text-foreground text-sm leading-relaxed
                            p-4 rounded-lg w-xl
                            left-0 top-7 z-10">
              <em><strong>XTree</strong></em> is a fast, memory-efficient, k-mer–based sequence alignment tool designed to map short and
              long reads against extremely large reference databases, including millions of genomes across bacteria, eukaryotes, and viruses.
              It enables accurate taxonomic detection and abundance estimation even when reference collections are large, diverse, or
              incomplete. <br /><br />
              XTree operates in two complementary modes.<br /> In <strong>BUILD</strong> mode, reference genomes are indexed into a compressed,
              memory-mapped k-mer database using motif-based subsampling and canonicalization, producing scalable indices that can be
              shared efficiently across parallel processes.<br /> In <strong>ALIGN</strong> mode, sequencing reads are matched against this
              index using exact k-mer lookups, with optional global read redistribution to resolve multi-mapping reads and generate
              robust reference-level and taxonomic assignments, along with coverage-based abundance estimates.
            </div>
          </div>
        </div>

        {/* links + how-to */}
        <div className="flex gap-4 text-sm items-center">
          {/* How to use */}
          <div className="relative group">
            <span
              className="cursor-default text-accent transition
                        hover:text-foreground hover:scale-[1.05]"
            >
              How to use
            </span>

            {/* hover panel */}
            <div
              className="pointer-events-none absolute right-0 top-full mt-2 w-xl
                        rounded-md border border-border bg-background p-3 text-small
                        text-muted-foreground shadow-lg opacity-0 scale-95
                        transition-all duration-150
                        group-hover:opacity-100 group-hover:scale-100"
            >
              <p className="mb-2 text-foreground text-center font-medium">
                Quick usage guide
              </p>
              <ul className="space-y-1">
                <li>1 • Choose between <strong>ALIGN</strong> or <strong>BUILD</strong>  modes.</li>
                <li>2 • Upload a <strong>FASTA</strong> or <strong>FASTQ</strong> file containing your sequences.</li>
                <li>3 • Click <strong>Run</strong> and view results in real time.</li>
              </ul>
            </div>
          </div>

          {/* Manuscript */}
          <a
            href="https://doi.org/10.64898/2025.12.22.696015"
            target="_blank"
            className="text-accent transition
                      hover:text-foreground hover:scale-[1.05]"
          >
            Manuscript
          </a>

          {/* GitHub */}
          <a
            href="https://github.com/two-frontiers-project/2FP-XTree"
            target="_blank"
            className="text-accent transition
                      hover:text-foreground hover:scale-[1.05]"
          >
            GitHub
          </a>
        </div>

      </div>


      {/* mode selector */}
      <div className="flex gap-3">
        <button
          onClick={() => setMode("ALIGN")}
          className={`px-4 py-2 rounded-full border transition
            ${
              mode === "ALIGN"
                ? "bg-accent text-black border-accent font-semibold"
                : "border-secondary/40 text-secondary hover:border-accent hover:text-accent"
            }
          `}
        >
          ALIGN
        </button>

        <button
          onClick={() => setMode("BUILD")}
          className={`px-4 py-2 rounded-full border transition
            ${
              mode === "BUILD"
                ? "bg-accent text-black border-accent font-semibold"
                : "border-secondary/40 text-secondary hover:border-accent hover:text-accent"
            }
          `}
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
          className={`relative border border-dashed p-6 text-center font-bold transition-colors rounded-lg
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
              className="absolute top-3 right-4
                        w-7 h-7
                        flex items-center justify-center
                        text-red-500 border border-red-500
                        rounded-full
                        transition hover:bg-red-500 hover:text-black"
              aria-label="Remove sequence file"
            >
              <X size={14} />
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
        className={`border p-6 text-center font-bold cursor-pointer
                    transition
                    rounded-lg
                    hover:scale-[1.02]
                    ${
                      seqFile
                        ? "border-accent text-accent"
                        : "border-secondary/40 text-accent hover:border-accent hover:text-foreground"
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
            className={`relative border border-dashed p-6 text-center font-bold transition-colors rounded-lg
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
                className="absolute top-3 right-4
                          w-7 h-7
                          flex items-center justify-center
                          text-red-500 border border-red-500
                          rounded-full
                          transition hover:bg-red-500 hover:text-black"
                aria-label="Remove map file"
              >
                <X size={14} />
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
            className={`border p-6 text-center font-bold cursor-pointer
                        transition
                        rounded-lg
                        hover:scale-[1.02]
                        ${
                          seqFile
                            ? "border-accent text-accent"
                            : "border-secondary/40 text-accent hover:border-accent hover:text-foreground"
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
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              Database
              <select
                value={db}
                onChange={(e) => setDb(e.target.value as any)}
                className="w-full border p-1 h-8 bg-transparent "
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
                className="w-full border p-1 bg-transparent rounded-lg"
              />
            </label>
          </div>
        )}


      {mode === "BUILD" && (
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            k-mer size
            <input
              type="number"
              value={kmer}
              onChange={(e) => setKmer(Number(e.target.value))}
              className="w-full border p-1 bg-transparent rounded-lg"
            />
          </label>

          <label className="block">
            Compression level
            <select
              value={comp}
              onChange={(e) => setComp(Number(e.target.value) as any)}
              className="w-full border p-1 h-8 bg-transparent"
            >
              <option value={0}>0</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </label>
        </div>
      )}
      </div>

      {/* advanced */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-accent
                    transition
                    hover:text-foreground hover:scale-[1.03]
                    active:scale-[0.98]"
        >
          {showAdvanced ? "Hide advanced settings" : "Show advanced settings"}
        </button>

        {showAdvanced && (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                Threads
                <input
                  type="number"
                  value={threads}
                  onChange={(e) => setThreads(Number(e.target.value))}
                  className="w-full border p-1 bg-transparent rounded-lg"
                />
              </label>

              <label className="block">
                Log output file name
                <input
                  type="text"
                  value={logOut}
                  onChange={(e) => setLogOut(e.target.value)}
                  className="w-full border p-1 bg-transparent rounded-lg"
                />
              </label>
            </div>

            {mode === "ALIGN" && (
              <>
                <p className="font-bold underline underline-offset-4">Outputs</p>
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

                <p className="font-bold underline underline-offset-4 mt-4">Algorithms</p>
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

                <p className="font-bold underline underline-offset-4 mt-4">Performance</p>
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

      {/* run button */}
      <div className="flex items-center gap-3">
        <button
          onClick={runXTree}
          disabled={!seqFile || isStreaming}
          className="bg-accent px-6 py-3 text-black rounded-lg
                    font-semibold transition
                    hover:brightness-95 hover:scale-[1.02]
                    disabled:opacity-50 disabled:hover:scale-100"
        >
          {isStreaming ? "Running…" : status === "success" || status === "error" ? "Re-run XTree" : "Run XTree"}
        </button>

        {isStreaming && (
          <button
            onClick={abort}
            className="px-4 py-3 text-sm text-red-400 border border-red-400/40
                      rounded-lg transition hover:bg-red-400/10"
          >
            Cancel
          </button>
        )}

        {/* status indicator */}
        {status === "success" && (
          <span className="text-green-400 text-sm font-semibold">✓ Complete</span>
        )}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* ---- live output ---- */}
      {(stdout || stderr) && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-secondary">
            {status === "running" ? "Live output" : "Output"}
          </p>
          <pre
            ref={outputRef}
            className="max-h-80 overflow-y-auto bg-black/40 rounded-lg
                       p-4 text-xs font-mono text-codeText
                       leading-relaxed whitespace-pre-wrap break-all"
          >
            {stdout}
            {stderr && (
              <span className="text-red-400">{stderr}</span>
            )}
            {status === "running" && (
              <span className="animate-pulse text-accent">▌</span>
            )}
          </pre>
        </div>
      )}

      {/* ---- output files ---- */}
      {outputFiles.length > 0 && (
        <div className="rounded-lg border border-secondary/20 p-4 space-y-2">
          <p className="text-sm font-semibold text-secondary">Output files</p>
          {outputFiles.map((f) => {
            const fileName = f.split("/").pop() || f;
            return (
              <a
                key={f}
                href={`/api/xtree/output/download?file=${encodeURIComponent(f)}`}
                download
                className="flex items-center gap-2 text-sm text-accent
                           hover:text-foreground transition py-0.5"
              >
                <Download size={12} />
                {fileName}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
