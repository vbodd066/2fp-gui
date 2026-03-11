/* ============================================================
 * Navbar — shared navigation bar
 * ============================================================
 * Used across all pages: landing, auth, tools, dashboard.
 * Shows logo, nav links, and auth-aware CTA.
 *
 * Auth-aware: fetches /api/auth/session on mount to show
 * Dashboard + Sign Out when authenticated, or Sign In + Get
 * Started when not. Works without AuthProvider wrapper.
 * ============================================================ */

"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Menu, X, LogOut } from "lucide-react";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoaded, setAuthLoaded] = useState(false);

  /* ---- check session on mount ---- */
  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setIsAuthenticated(data.authenticated === true);
      })
      .catch(() => {
        setIsAuthenticated(false);
      })
      .finally(() => setAuthLoaded(true));
  }, []);

  /* ---- sign out handler ---- */
  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
    setIsAuthenticated(false);
    window.location.href = "/";
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50
                    border-b border-secondary/10 bg-background/80
                    backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* ---- Logo ---- */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Image
            src="/TwoFrontiersLogo.png"
            alt="2FP"
            width={160}
            height={40}
            className="object-contain h-8 w-auto"
          />
        </Link>

        {/* ---- Desktop links ---- */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/#features"
            className="text-sm text-secondary hover:text-foreground transition"
          >
            Features
          </Link>
          <Link
            href="/#pricing"
            className="text-sm text-secondary hover:text-foreground transition"
          >
            Pricing
          </Link>
          <a
            href="https://github.com/two-frontiers-project"
            target="_blank"
            className="text-sm text-secondary hover:text-foreground transition"
          >
            GitHub
          </a>

          {authLoaded && isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-secondary hover:text-foreground transition"
              >
                Dashboard
              </Link>
              <Link
                href="/tools"
                className="text-sm text-secondary hover:text-foreground transition"
              >
                Tools
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-sm text-secondary
                           hover:text-foreground transition"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </>
          ) : authLoaded ? (
            <>
              <Link
                href="/auth/signin"
                className="text-sm text-secondary hover:text-foreground transition"
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="bg-accent text-black px-4 py-2 rounded-lg text-sm
                           font-semibold transition hover:brightness-110 hover:scale-[1.02]"
              >
                Get Started
              </Link>
            </>
          ) : null}
        </div>

        {/* ---- Mobile toggle ---- */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-secondary hover:text-foreground transition"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* ---- Mobile menu ---- */}
      {mobileOpen && (
        <div className="md:hidden border-t border-secondary/10 bg-background px-6 py-4 space-y-3">
          <Link
            href="/#features"
            onClick={() => setMobileOpen(false)}
            className="block text-sm text-secondary hover:text-foreground transition"
          >
            Features
          </Link>
          <Link
            href="/#pricing"
            onClick={() => setMobileOpen(false)}
            className="block text-sm text-secondary hover:text-foreground transition"
          >
            Pricing
          </Link>
          <a
            href="https://github.com/two-frontiers-project"
            target="_blank"
            className="block text-sm text-secondary hover:text-foreground transition"
          >
            GitHub
          </a>

          {authLoaded && isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="block text-sm text-secondary hover:text-foreground transition"
              >
                Dashboard
              </Link>
              <Link
                href="/tools"
                onClick={() => setMobileOpen(false)}
                className="block text-sm text-secondary hover:text-foreground transition"
              >
                Tools
              </Link>
              <button
                onClick={() => { setMobileOpen(false); handleSignOut(); }}
                className="flex items-center gap-1.5 text-sm text-secondary
                           hover:text-foreground transition"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </>
          ) : authLoaded ? (
            <>
              <Link
                href="/auth/signin"
                onClick={() => setMobileOpen(false)}
                className="block text-sm text-secondary hover:text-foreground transition"
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                onClick={() => setMobileOpen(false)}
                className="block bg-accent text-black px-4 py-2 rounded-lg text-sm
                           font-semibold text-center transition hover:brightness-110"
              >
                Get Started
              </Link>
            </>
          ) : null}
        </div>
      )}
    </nav>
  );
}
