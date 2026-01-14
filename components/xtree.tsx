"use client";

export default function XTree() {
  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header + Resources */}
      <div className="flex items-center justify-between border-b border-[color:var(--color-secondary)]/20 pb-3">
        <h3 className="text-lg font-semibold">XTree Alignment</h3>

        <div className="flex gap-4 text-sm">
          <a
            href="https://doi.org/10.64898/2025.12.22.696015"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--color-accent)] hover:underline"
          >
            Manuscript
          </a>
          <a
            href="https://github.com/two-frontiers-project/2FP-XTree"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--color-accent)] hover:underline"
          >
            GitHub
          </a>
        </div>
      </div>

      <p className="text-sm text-[color:var(--color-secondary)]">
        Memory-efficient alignment of short or long reads against large bacterial,
        viral, and eukaryotic reference databases.
      </p>

      {/* Step 1 */}
      <section className="space-y-1">
        <p className="font-medium">1. Select reference database</p>
        <select className="w-full rounded border border-[color:var(--color-secondary)]/30 bg-transparent p-2 text-sm">
          <option>Genome Taxonomy Database (GTDB)</option>
          <option>Pan-Viral Compendium (PVC)</option>
          <option>Fungal & Protozoan GenBank</option>
          <option disabled>Custom database (local only)</option>
        </select>
        <p className="text-xs text-[color:var(--color-secondary)]">
          Default: GTDB (bacterial and archaeal genomes)
        </p>
      </section>

      {/* Step 2 */}
      <section className="space-y-2">
        <p className="font-medium">2. Upload sequencing data</p>
        <p className="text-xs text-[color:var(--color-secondary)]">
          FASTA or FASTQ. Single or paired-end. Short and long reads supported.
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
                accept=".fa,.fasta,.fq,.fastq,.gz"
                className="hidden"
              />
            </label>
          </div>
        </div>
      </section>

      {/* Step 3 */}
      <section className="space-y-2">
        <p className="font-medium">3. Alignment settings</p>

        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" defaultChecked />
            Global read redistribution
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" />
            Taxonomic assignment
          </label>
        </div>

        <p className="text-xs text-[color:var(--color-secondary)]">
          Defaults: redistribution enabled; taxonomic output disabled
        </p>
      </section>

      {/* Advanced */}
      <details className="rounded border border-[color:var(--color-secondary)]/20 p-4">
        <summary className="cursor-pointer text-sm font-medium">
          Advanced settings
        </summary>

        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            Coverage threshold (%)
            <input
              type="number"
              defaultValue={5}
              min={1}
              max={20}
              className="mt-1 w-full rounded border border-[color:var(--color-secondary)]/30 bg-transparent p-1"
            />
          </label>

          <p className="text-xs text-[color:var(--color-secondary)]">
            Default: 5% unique coverage. Typical range: 1–10%, depending on
            database and organism.
          </p>
        </div>
      </details>

      {/* Run */}
      <button
        disabled
        className="rounded bg-[color:var(--color-accent)]/80 px-4 py-2 text-sm font-medium text-black opacity-50"
      >
        Run XTree Alignment
      </button>

      <p className="text-xs text-[color:var(--color-secondary)]">
        This web interface supports exploratory analyses only. Large datasets and
        full parameter control require local or HPC execution.
      </p>
    </div>
  );
}
