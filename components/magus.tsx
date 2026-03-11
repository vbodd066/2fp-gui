/* ============================================================
 * MAGUS — thin wrapper for the cell-based notebook interface
 * ============================================================
 * PRD §6.6 — "components/magus.tsx (rewrite): Thin wrapper
 * that renders <MagusNotebook />."
 *
 * This component handles:
 *  - Header with title, info tooltip, and links
 *  - Delegates all workflow logic to MagusNotebook
 *
 * Removed (PRD §5.2 / §7):
 *  - Email input field
 *  - Monolithic stage form with toggles
 *  - Single "submit" flow
 * ============================================================ */

"use client";

import { HelpCircle } from "lucide-react";
import MagusNotebook from "./magus/MagusNotebook";

export default function MAGUS() {
  return (
    <div className="space-y-8 w-full">
      {/* ---- header ---- */}
      <div className="flex justify-between pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold">MAGUS Workflow</h3>

          <div className="relative group">
            <button
              type="button"
              className="text-secondary hover:text-accent transition"
              aria-label="About MAGUS"
            >
              <HelpCircle size={20} />
            </button>

            <div className="absolute hidden group-hover:block
                            bg-black text-foreground text-sm leading-relaxed
                            p-4 rounded-lg w-md
                            left-0 top-7 z-10">
              <em><strong>MAGUS</strong></em> is a modular metagenomic analysis toolkit designed for deeply
              sequenced, multi-domain datasets—particularly those dominated by large
              eukaryotic genomes. Rather than enforcing a fixed pipeline, MAGUS provides
              interoperable tools for iterative assembly, filtering, co-assembly, genome
              recovery, and gene catalog construction, allowing workflows to scale with
              both data complexity and available compute.
            </div>
          </div>
        </div>

        {/* links */}
        <div className="flex gap-4 text-sm">
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
                <li>1 • Upload a <strong>FASTQ</strong> file containing your sequences.</li>
                <li>2 • Configure each <strong>stage cell</strong> with your desired parameters.</li>
                <li>3 • Click <strong>Run</strong> on individual stages or <strong>Run All</strong> to execute the full pipeline.</li>
                <li>4 • View live output and download results directly in each cell.</li>
              </ul>
            </div>
          </div>

          {/* Manuscript */}
          <a
            href="https://doi.org/10.64898/2025.12.22.696022"
            target="_blank"
            className="text-accent transition
                      hover:text-foreground hover:scale-[1.05]"
          >
            Manuscript
          </a>

          <a
            href="https://github.com/two-frontiers-project/2FP_MAGUS"
            target="_blank"
            className="text-accent transition
                      hover:text-foreground hover:scale-[1.05]"
          >
            GitHub
          </a>
        </div>
      </div>

      {/* ---- cell-based notebook ---- */}
      <MagusNotebook />
    </div>
  );
}
