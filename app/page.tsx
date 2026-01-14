"use client";

import { useState } from "react";
import Image from "next/image";
import XTree from "@/components/xtree";
import MAGUS from "@/components/magus";


export default function BioinformaticsTools() {
  const [activeTab, setActiveTab] = useState<"xtree" | "magus">("xtree");

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Top Info Section */}
        <header className="space-y-6">
          <div className="w-full max-w-xl mx-auto">
            <Image
              src="/TwoFrontiersLogo.png"
              alt="Two Frontiers Project"
              width={1200}
              height={300}
              priority
              className="object-contain"
            />
          </div>

        </header>

        {/* Description Section */}
        <section className="space-y-6 mx-auto max-w-3xl">
          <h1 className="font-bold text-4xl">
            Two Frontiers Project Bioinformatics Tools
          </h1>

          <p className="text-[color:var(--color-foreground)] leading-relaxed">
            2FP builds open bioinformatics tools designed to scale
            with modern sequencing data—across organisms, environments, and domains
            of life. As reference databases grow into the millions of genomes and
            datasets reach hundreds of millions of reads per sample, traditional
            analysis approaches increasingly struggle with memory use, runtime,
            and flexibility. XTree and MAGUS address different parts of this problem.
          </p>

          <p className="text-[color:var(--color-foreground)] leading-relaxed">
            <strong>XTree</strong> is a fast,
            memory-efficient sequence aligner built to map short and long reads against
            extremely large reference databases, spanning bacteria, viruses, and
            eukaryotes. It is optimized for whole-genome alignment at scale, enabling
            accurate taxonomic detection and abundance estimation even when references
            are large, diverse, or incomplete.
          </p>

          <p className="text-[color:var(--color-foreground)] leading-relaxed">
            <strong>MAGUS</strong> is a modular metagenomic analysis toolkit designed for deeply
            sequenced, multi-domain datasets—particularly those dominated by large
            eukaryotic genomes. Rather than enforcing a fixed pipeline, MAGUS provides
            interoperable tools for iterative assembly, filtering, co-assembly, genome
            recovery, and gene catalog construction, allowing workflows to scale with
            both data complexity and available compute.
          </p>

          <p className="text-[color:var(--color-secondary)] mx-auto max-w-3xl leading-relaxed text-xs">
           This site provides web-based graphical interfaces for selected functionality from XTree and MAGUS, designed for
           interactive exploration, demonstration, and small-scale analyses using uploaded FASTA or FASTQ files. For full
           parameter control, custom workflows, or large datasets, we recommend running both tools locally or on HPC or
           cloud infrastructure.
          </p>

        </section>

        {/* Tabs */}
        <section className="space-y-4">
          <div className="flex w-full border-b border-[color:var(--color-secondary)]/30">
            <button
              onClick={() => setActiveTab("xtree")}
              className={`flex-1 px-4 py-3 text-sm text-center font-semibold transition ${
                activeTab === "xtree"
                  ? "border-b-2 border-[color:var(--color-accent)] text-[color:var(--color-accent)]"
                  : "text-[color:var(--color-secondary)] hover:text-[color:var(--color-foreground)]"
              }`}
            >
              XTree Interface
            </button>

            <button
              onClick={() => setActiveTab("magus")}
              className={`flex-1 px-4 py-3 text-sm text-center font-semibold transition ${
                activeTab === "magus"
                  ? "border-b-2 border-[color:var(--color-accent)] text-[color:var(--color-accent)]"
                  : "text-[color:var(--color-secondary)] hover:text-[color:var(--color-foreground)]"
              }`}
            >
              MAGUS Interface
            </button>
          </div>



          <div className="rounded-lg border border-[color:var(--color-secondary)]/20 p-6 min-h-[320px]">
            {activeTab === "xtree" && <XTree />}
            {activeTab === "magus" && <MAGUS />}
          </div>
        </section>


        {/* Citation Section */}
        <section className="rounded-lg border border-[color:var(--color-secondary)]/20 p-6 space-y-6">
          <h2 className="text-lg font-medium">Citation</h2>

          <p className="text-sm text-[color:var(--color-secondary)] mx-auto">
            If results generated through this interface contribute to a
            publication, please cite the original tools listed below.
            Proper attribution ensures continued support for open academic
            bioinformatics software.
          </p>

          <div className="space-y-4 font-mono text-sm">
            <div className="rounded border border-[color:var(--color-secondary)]/20 bg-[color:var(--color-codeBg)] p-4">
              <p className="mb-2 text-[color:var(--color-secondary)]">
                XTree citation:
              </p>
              <pre className="whitespace-pre-wrap text-[color:var(--color-codeText)]">
Al-Ghalith GA, Ryon KA, Henriksen JR, Danko DC, Farthing B, Marengo M,
Church GM, Peixoto RS, Patel CJ, Knights D, Tierney BT.
XTree enables memory-efficient, accurate short and long sequence alignment
to millions of genomes across the tree of life.
bioRxiv (2025). https://doi.org/10.64898/2025.12.22.696015
              </pre>
            </div>

            <div className="rounded border border-[color:var(--color-secondary)]/20 bg-[color:var(--color-codeBg)] p-4">
              <p className="mb-2 text-[color:var(--color-secondary)]">
                MAGUS citation:
              </p>
              <pre className="whitespace-pre-wrap text-[color:var(--color-codeText)]">
Al-Ghalith GA, Ryon KA, Santoro E, Barno A, Casartelli M, Villela H,
Diana SC, Henriksen JR, Carpenter GE, Quatrini P, Milazzo M,
Patel CJ, Peixoto R, Tierney BT.
Modular metagenomic analysis of pan-domain symbioses with MAGUS.
bioRxiv (2025). https://doi.org/10.64898/2025.12.22.696022
              </pre>
            </div>
          </div>
        </section>


      </div>
    </div>
  );
}
