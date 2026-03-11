/* ============================================================
 * Landing Page — public marketing page for 2FP
 * ============================================================
 * This is the root route ("/"). Shows:
 *  - Hero section with CTA
 *  - Features overview
 *  - Pricing tiers
 *  - Footer
 *
 * The tools interface has been moved to /tools.
 * ============================================================ */

import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Pricing from "@/components/landing/Pricing";
import Footer from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <Hero />

        {/* ---- divider ---- */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="border-t border-secondary/10" />
        </div>

        <Features />

        {/* ---- divider ---- */}
        <div className="max-w-6xl mx-auto px-6">
          <div className="border-t border-secondary/10" />
        </div>

        <Pricing />
      </main>
      <Footer />
    </>
  );
}
