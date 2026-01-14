"use client";

export default function MAGUS() {
  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header + Resources */}
      <div className="flex items-center justify-between border-b border-[color:var(--color-secondary)]/20 pb-3">
        <h3 className="text-lg font-semibold">MAGUS Metagenomic Workflow</h3>

        <div className="flex gap-4 text-sm">
          <a
            href="https://doi.org/10.64898/2025.12.22.696022"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--color-accent)] hover:underline"
          >
            Manuscript
          </a>
          <a
            href="https://github.com/two-frontiers-project/2FP_MAGUS"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--color-accent)] hover:underline"
          >
            GitHub
          </a>
        </div>
      </div>

      <p className="text-sm text-[color:var(--color-secondary)]">
        Modular analysis of deeply sequenced, multi-domain metagenomes using
        iterative assembly and filtering.
      </p>

      {/* Step 1 */}
      <section className="space-y-2">
        <p className="font-medium">1. Upload metagenomic reads</p>
        <p className="text-xs text-[color:var(--color-secondary)]">
          Shotgun metagenomic FASTQ files. Single-end only in this interface.
        </p>

        <div className="grid grid-cols-2 gap-4 w-full">
          <div className="flex items-center justify-center rounded border border-dashed border-[color:var(--color-secondary)]/40 p-6 text-sm text-[color:var(--color-secondary)]">
            Drag & drop files here
          </div>

          <div className="flex items-center justify-center rounded border border-[color:var(--color-secondary)]/30 p-6">
            <label className="cursor-pointer rounded bg-[color:var(--color-accent)]/80 px-4 py-2 text-sm font-medium text-black">
              Browse files
              <input
                type="file"
                accept=".fq,.fastq,.gz"
                className="hidden"
              />
            </label>
          </div>
        </div>
      </section>

      {/* Step 2 */}
      <section className="space-y-1">
        <p className="font-medium">2. Choose workflow preset</p>

        <select className="w-full rounded border border-[color:var(--color-secondary)]/30 bg-transparent p-2 text-sm">
          <option>Eukaryote-dominant community</option>
          <option>Balanced multi-domain community</option>
          <option>Bacteria-focused analysis</option>
        </select>

        <p className="text-xs text-[color:var(--color-secondary)]">
          Default: Eukaryote-dominant community
        </p>
      </section>

      {/* Step 3 */}
      <section className="space-y-2">
        <p className="font-medium">3. Enabled analysis stages</p>

        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked />
            Initial assembly and binning
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked />
            Eukaryotic genome identification and filtering
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" />
            Co-assembly across samples
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" />
            Gene catalog construction
          </label>
        </div>

        <p className="text-xs text-[color:var(--color-secondary)]">
          Defaults: initial assembly and eukaryotic filtering enabled
        </p>
      </section>

      {/* Advanced */}
      <details className="rounded border border-[color:var(--color-secondary)]/20 p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Advanced settings
        </summary>

        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            Subsampling depth (reads)
            <input
              type="number"
              defaultValue={100000000}
              className="mt-1 w-full rounded border border-[color:var(--color-secondary)]/30 bg-transparent p-1"
            />
          </label>

          <p className="text-xs text-[color:var(--color-secondary)]">
            Default: 100 million reads for first-pass assembly.
          </p>
        </div>
      </details>

      {/* Run */}
      <button
        disabled
        className="rounded bg-[color:var(--color-accent)]/80 px-4 py-2 text-sm font-medium text-black opacity-50"
      >
        Run MAGUS Workflow
      </button>

      <p className="text-xs text-[color:var(--color-secondary)]">
        This interface exposes a limited, demonstration-focused subset of MAGUS.
        Full workflows require local or HPC execution.
      </p>
    </div>
  );
}
