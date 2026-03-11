/* ============================================================
 * CellOutput — live-streaming stdout/stderr display
 * ============================================================
 * Renders accumulated stdout and stderr from a running (or
 * completed) MAGUS stage cell. Auto-scrolls to bottom during
 * streaming. Shows output files list after completion.
 *
 * PRD §6.2 — "Live output" panel within each cell.
 * PRD §6.6 — CellOutput component responsibility.
 *
 * Props:
 *  - stdout / stderr: accumulated text from SSE stream
 *  - outputFiles: list of artifact paths after success
 *  - status: current cell status (controls auto-scroll)
 *  - error: optional error message
 * ============================================================ */

"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ChevronDown, ChevronUp } from "lucide-react";
import type { CellStatus } from "@/lib/types/magus";

type Props = {
  stdout: string;
  stderr: string;
  outputFiles: string[];
  status: CellStatus;
  error?: string;
};

export default function CellOutput({
  stdout,
  stderr,
  outputFiles,
  status,
  error,
}: Props) {
  const scrollRef = useRef<HTMLPreElement>(null);
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"stdout" | "stderr">("stdout");

  /* ---- auto-scroll while running ---- */
  useEffect(() => {
    if (status === "running" && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [stdout, stderr, status]);

  const hasOutput = stdout.length > 0 || stderr.length > 0;
  const hasFiles = outputFiles.length > 0;

  if (!hasOutput && !hasFiles && !error) return null;

  return (
    <div className="mt-3 space-y-2">
      {/* ---- toggle header ---- */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-sm text-secondary
                   hover:text-foreground transition"
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {status === "running" ? "Live output" : "Output"}
      </button>

      {expanded && (
        <div className="space-y-2">
          {/* ---- stdout/stderr tabs ---- */}
          {hasOutput && (
            <div>
              <div className="flex gap-1 text-xs border-b border-secondary/20 mb-1">
                <button
                  onClick={() => setActiveTab("stdout")}
                  className={`px-3 py-1 transition ${
                    activeTab === "stdout"
                      ? "border-b-2 border-accent text-accent"
                      : "text-secondary hover:text-foreground"
                  }`}
                >
                  stdout
                  {stderr.length > 0 && activeTab !== "stdout" && (
                    <span className="ml-1 text-secondary">
                      ({stdout.split("\n").length - 1})
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("stderr")}
                  className={`px-3 py-1 transition ${
                    activeTab === "stderr"
                      ? "border-b-2 border-red-400 text-red-400"
                      : "text-secondary hover:text-foreground"
                  }`}
                >
                  stderr
                  {stderr.length > 0 && (
                    <span className="ml-1 text-red-400/60">
                      ({stderr.split("\n").length - 1})
                    </span>
                  )}
                </button>
              </div>

              <pre
                ref={scrollRef}
                className="max-h-64 overflow-y-auto overflow-x-hidden
                           bg-black/40 rounded p-3 text-xs font-mono
                           text-codeText leading-relaxed
                           whitespace-pre-wrap break-all"
              >
                {activeTab === "stdout" ? stdout : stderr}
                {status === "running" && (
                  <span className="animate-pulse text-accent">▌</span>
                )}
              </pre>
            </div>
          )}

          {/* ---- error message ---- */}
          {error && (
            <div className="rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
              <p className="font-semibold mb-1">Error</p>
              <p>{error}</p>
            </div>
          )}

          {/* ---- output files ---- */}
          {hasFiles && (
            <div className="rounded border border-secondary/20 p-3 space-y-1">
              <p className="text-xs font-semibold text-secondary mb-2">
                Output files
              </p>
              {outputFiles.map((f) => {
                const fileName = f.split("/").pop() || f;
                return (
                  <a
                    key={f}
                    href={`/api/magus/output/download?file=${encodeURIComponent(f)}`}
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
      )}
    </div>
  );
}
