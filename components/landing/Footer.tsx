/* ============================================================
 * Footer — shared site footer
 * ============================================================
 * Used on landing, auth, and dashboard pages.
 * Contains links, citations, and copyright.
 * ============================================================ */

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-secondary/10 mt-20">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* ---- Brand ---- */}
          <div className="space-y-3">
            <p className="font-semibold text-foreground">
              Two Frontiers Project
            </p>
            <p className="text-sm text-secondary leading-relaxed">
              Open bioinformatics tools designed to scale with modern
              sequencing data—across organisms, environments, and
              domains of life.
            </p>
          </div>

          {/* ---- Tools ---- */}
          <div className="space-y-3">
            <p className="font-semibold text-foreground text-sm">Tools</p>
            <ul className="space-y-2 text-sm text-secondary">
              <li>
                <Link href="/tools" className="hover:text-foreground transition">
                  XTree
                </Link>
              </li>
              <li>
                <Link href="/tools" className="hover:text-foreground transition">
                  MAGUS
                </Link>
              </li>
            </ul>
          </div>

          {/* ---- Resources ---- */}
          <div className="space-y-3">
            <p className="font-semibold text-foreground text-sm">Resources</p>
            <ul className="space-y-2 text-sm text-secondary">
              <li>
                <a
                  href="https://doi.org/10.64898/2025.12.22.696015"
                  target="_blank"
                  className="hover:text-foreground transition"
                >
                  XTree Manuscript
                </a>
              </li>
              <li>
                <a
                  href="https://doi.org/10.64898/2025.12.22.696022"
                  target="_blank"
                  className="hover:text-foreground transition"
                >
                  MAGUS Manuscript
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/two-frontiers-project"
                  target="_blank"
                  className="hover:text-foreground transition"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          {/* ---- Account ---- */}
          <div className="space-y-3">
            <p className="font-semibold text-foreground text-sm">Account</p>
            <ul className="space-y-2 text-sm text-secondary">
              <li>
                <Link href="/auth/signin" className="hover:text-foreground transition">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/auth/signup" className="hover:text-foreground transition">
                  Create account
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-foreground transition">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* ---- Bottom bar ---- */}
        <div className="mt-10 pt-6 border-t border-secondary/10
                        flex flex-col md:flex-row justify-between
                        items-center gap-3 text-xs text-secondary">
          <p>© {new Date().getFullYear()} Two Frontiers Project. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground transition">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
