/* ============================================================
 * Sign In — email/password or access-code authentication
 * ============================================================
 * Supports two modes:
 *  1. Email + password — standard account login
 *  2. Access code (PRD §G6) — shared instance password
 *
 * Toggled via a tab-style UI at the top of the form.
 *
 * Integration point: POST /api/auth/signin
 * ============================================================ */

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import Navbar from "@/components/landing/Navbar";

type AuthMode = "email" | "accessCode";

export default function SignInPage() {
  const [mode, setMode] = useState<AuthMode>("email");

  /* email + password */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  /* access code */
  const [accessCode, setAccessCode] = useState("");

  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload =
        mode === "email"
          ? { email: email.trim(), password }
          : { accessCode: accessCode.trim() };

      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Sign in failed");
      }

      /* Redirect to tools on success */
      window.location.href = "/tools";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    mode === "email"
      ? email.trim() && password
      : accessCode.trim();

  return (
    <>
      <Navbar />

      <div className="min-h-screen flex items-center justify-center px-6 pt-16">
        <div className="w-full max-w-md space-y-8">
          {/* ---- logo ---- */}
          <div className="text-center space-y-4">
            <div className="w-48 mx-auto">
              <Image
                src="/TwoFrontiersLogo.png"
                alt="2FP"
                width={400}
                height={100}
                className="object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold">Sign in to your instance</h1>
            <p className="text-sm text-secondary">
              Use your account credentials or instance access code.
            </p>
          </div>

          {/* ---- mode tabs ---- */}
          <div className="flex rounded-lg border border-secondary/20 overflow-hidden">
            <button
              type="button"
              onClick={() => { setMode("email"); setError(null); }}
              className={`flex-1 py-2.5 text-sm font-medium transition
                ${mode === "email"
                  ? "bg-accent/10 text-accent border-b-2 border-accent"
                  : "text-secondary hover:text-foreground"
                }
              `}
            >
              Email &amp; Password
            </button>
            <button
              type="button"
              onClick={() => { setMode("accessCode"); setError(null); }}
              className={`flex-1 py-2.5 text-sm font-medium transition
                ${mode === "accessCode"
                  ? "bg-accent/10 text-accent border-b-2 border-accent"
                  : "text-secondary hover:text-foreground"
                }
              `}
            >
              Access Code
            </button>
          </div>

          {/* ---- form ---- */}
          <form onSubmit={handleSignIn} className="space-y-6">
            {mode === "email" ? (
              <>
                {/* email */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary">
                      <Mail size={16} />
                    </div>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@lab.university.edu"
                      autoFocus
                      className="w-full bg-transparent border border-secondary/30
                                 rounded-lg pl-10 pr-4 py-3 text-sm
                                 placeholder:text-secondary/50
                                 focus:outline-none focus:border-accent transition"
                    />
                  </div>
                </div>

                {/* password */}
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary">
                      <Lock size={16} />
                    </div>
                    <input
                      id="password"
                      type={showSecret ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-transparent border border-secondary/30
                                 rounded-lg pl-10 pr-12 py-3 text-sm
                                 placeholder:text-secondary/50
                                 focus:outline-none focus:border-accent transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2
                                 text-secondary hover:text-foreground transition"
                      aria-label={showSecret ? "Hide password" : "Show password"}
                    >
                      {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* access code */
              <div className="space-y-2">
                <label htmlFor="accessCode" className="block text-sm font-medium">
                  Access Code
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary">
                    <Lock size={16} />
                  </div>
                  <input
                    id="accessCode"
                    type={showSecret ? "text" : "password"}
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="Enter your instance access code"
                    autoFocus
                    className="w-full bg-transparent border border-secondary/30
                               rounded-lg pl-10 pr-12 py-3 text-sm
                               placeholder:text-secondary/50
                               focus:outline-none focus:border-accent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2
                               text-secondary hover:text-foreground transition"
                    aria-label={showSecret ? "Hide code" : "Show code"}
                  >
                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* error message */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5
                              p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* submit button */}
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="w-full flex items-center justify-center gap-2
                         bg-accent text-black py-3 rounded-lg
                         text-sm font-semibold transition
                         hover:brightness-110 hover:scale-[1.01]
                         disabled:opacity-50 disabled:hover:scale-100
                         disabled:hover:brightness-100"
            >
              {loading ? "Signing in…" : "Sign In"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          {/* ---- footer links ---- */}
          <div className="text-center space-y-3 text-sm text-secondary">
            <p>
              Don&apos;t have an instance?{" "}
              <Link
                href="/auth/signup"
                className="text-accent hover:text-foreground transition"
              >
                Create an account
              </Link>
            </p>
            <p>
              <Link
                href="/"
                className="text-secondary hover:text-foreground transition"
              >
                ← Back to home
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
