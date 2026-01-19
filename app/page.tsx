"use client";

import { useState } from "react";
import Image from "next/image";
import XTree from "@/components/xtree";
import MAGUS from "@/components/magus";
import Citations from "@/components/citations";

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
        <section className="space-y-6 mx-auto max-w-4xl">
          <h1 className="font-bold text-center text-4xl">
            Two Frontiers Project Bioinformatics Tools
          </h1>

          <p className="text-foreground leading-relaxed">
            2FP builds open bioinformatics tools designed to scale
            with modern sequencing data—across organisms, environments, and domains
            of life. As reference databases grow into the millions of genomes and
            datasets reach hundreds of millions of reads per sample, traditional
            analysis approaches increasingly struggle with memory use, runtime,
            and flexibility. XTree and MAGUS address different parts of this problem.
          </p>

        </section>

        {/* Tabs */}
        <section className="space-y-4">
          <div className="flex w-full border-b text-secondary">
            <button
              onClick={() => setActiveTab("xtree")}
              className={`flex-1 px-4 py-3 text-sm text-center font-semibold transition ${
                activeTab === "xtree"
                  ? "border-b-4 border-accent text-accent"
                  : "text-secondary hover:text-foreground"
              }`}
            >
              XTree Interface
            </button>

            <button
              onClick={() => setActiveTab("magus")}
              className={`flex-1 px-4 py-3 text-sm text-center font-semibold transition ${
                activeTab === "magus"
                  ? "border-b-4 border-accent text-accent"
                  : "text-secondary hover:text-foreground"
              }`}
            >
              MAGUS Interface
            </button>
          </div>



          <div className="rounded-lg border border-secondary/20 p-6 min-h-80">
            {activeTab === "xtree" && <XTree />}
            {activeTab === "magus" && <MAGUS />}
          </div>
        </section>


        {/* Citation Section */}
        <Citations />

      </div>
    </div>
  );
}
