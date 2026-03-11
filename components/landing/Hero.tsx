/* ============================================================
 * Hero — landing page hero section
 * ============================================================
 * Top-of-page call to action with value proposition,
 * description, and primary CTA buttons.
 * ============================================================ */

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Zap } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      {/* ---- background glow effect ---- */}
      <div
        className="absolute top-20 left-1/2 -translate-x-1/2
                    w-150 h-100 rounded-full
                    bg-accent/8 blur-[120px] pointer-events-none"
      />

      <div className="relative max-w-4xl mx-auto text-center space-y-8">
        {/* ---- badge ---- */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5
                        rounded-full border border-accent/30 bg-accent/5
                        text-sm text-accent">
          <Zap size={14} />
          Now available — isolated cloud instances
        </div>

        {/* ---- logo ---- */}
        <div className="w-full max-w-md mx-auto">
          <Image
            src="/TwoFrontiersLogo.png"
            alt="Two Frontiers Project"
            width={1200}
            height={300}
            priority
            className="object-contain"
          />
        </div>

        {/* ---- headline ---- */}
        <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight">
          Scalable metagenomics,{" "}
          <span className="text-accent">your own cloud.</span>
        </h1>

        {/* ---- subheading ---- */}
        <p className="text-lg text-secondary max-w-2xl mx-auto leading-relaxed">
          Run XTree and MAGUS on your own dedicated AWS instance.
          No shared infrastructure, no job queues, no waiting.
          Real-time interactive pipeline execution with full data isolation.
        </p>

        {/* ---- CTAs ---- */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 bg-accent text-black
                       px-8 py-3.5 rounded-lg text-base font-semibold
                       transition hover:brightness-110 hover:scale-[1.02]
                       active:scale-[0.98]"
          >
            Get Started <ArrowRight size={18} />
          </Link>

          <Link
            href="/#pricing"
            className="inline-flex items-center gap-2
                       border border-secondary/30 text-secondary
                       px-8 py-3.5 rounded-lg text-base
                       transition hover:text-foreground hover:border-secondary/60"
          >
            View Pricing
          </Link>
        </div>

        {/* ---- trust line ---- */}
        <p className="text-xs text-secondary/60 pt-4">
          Used by research labs worldwide • Open-source tools •
          Peer-reviewed publications
        </p>
      </div>
    </section>
  );
}
