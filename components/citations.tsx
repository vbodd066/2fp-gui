"use client";

import { Copy } from "lucide-react";
import { useState } from "react";

const XTREE_CITATION = `Al-Ghalith GA, Ryon KA, Henriksen JR, Danko DC, Farthing B, Marengo M,
Church GM, Peixoto RS, Patel CJ, Knights D, Tierney BT.
XTree enables memory-efficient, accurate short and long sequence alignment
to millions of genomes across the tree of life.
bioRxiv (2025). https://doi.org/10.64898/2025.12.22.696015`;

const MAGUS_CITATION = `Al-Ghalith GA, Ryon KA, Santoro E, Barno A, Casartelli M, Villela H,
Diana SC, Henriksen JR, Carpenter GE, Quatrini P, Milazzo M,
Patel CJ, Peixoto R, Tierney BT.
Modular metagenomic analysis of pan-domain symbioses with MAGUS.
bioRxiv (2025). https://doi.org/10.64898/2025.12.22.696022`;

export default function Citations() {
  const [copied, setCopied] = useState<"xtree" | "magus" | null>(null);

  function handleCopy(text: string, which: "xtree" | "magus") {
    // Preferred modern Clipboard API
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
      return;
    }

    // Fallback for insecure contexts / older browsers
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "0";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);

      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch (err) {
      console.error("Clipboard copy failed", err);
    }
  }

  return (
    <section className="rounded-lg border border-secondary/20 p-6 space-y-6">
      <h2 className="text-lg font-medium">Citation</h2>

      <p className="text-sm text-secondary max-w-3xl">
        If results generated through this interface contribute to a publication,
        please cite the original tools listed below. Proper attribution supports
        continued development of open academic bioinformatics software.
      </p>

      <div className="space-y-4 font-mono text-sm">
        {/* XTree citation */}
        <div className="relative rounded border border-secondary/20 bg-(--color-codeBg) p-4">
          <button
            onClick={() => handleCopy(XTREE_CITATION, "xtree")}
            className="absolute top-4 right-4 text-secondary hover:text-foreground transition"
            title="Copy citation to clipboard"
          >
            <Copy size={14} />
          </button>

          <p className="mb-2 text-secondary pl-6">
            XTree citation:
          </p>

          <pre className="whitespace-pre-wrap text-(--color-codeText)">
            {XTREE_CITATION}
          </pre>

          {copied === "xtree" && (
            <span className="absolute top-2 right-2 pr-10 text-xs text-accent">
              Copied
            </span>
          )}
        </div>

        {/* MAGUS citation */}
        <div className="relative rounded border border-secondary/20 bg-(--color-codeBg) p-4">
          <button
            onClick={() => handleCopy(MAGUS_CITATION, "magus")}
            className="absolute top-4 right-4 text-secondary hover:text-foreground transition"
            title="Copy citation to clipboard"
          >
            <Copy size={14} />
          </button>

          <p className="mb-2 text-secondary pl-6">
            MAGUS citation:
          </p>

          <pre className="whitespace-pre-wrap text-(--color-codeText)">
            {MAGUS_CITATION}
          </pre>

          {copied === "magus" && (
            <span className="absolute top-2 right-2 pr-10 text-xs text-accent">
              Copied
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
