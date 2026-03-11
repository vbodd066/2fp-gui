/* ============================================================
 * Sign Up — account creation with billing
 * ============================================================
 * PRD §G5 — "introduce a billing/provisioning layer that
 * spins up a new AWS instance for each customer."
 * PRD §4.2 — "User signs up → payment processed (Stripe) →
 * provision instance → receive URL + access code."
 *
 * This page collects:
 *  - Name, email, lab/organization
 *  - Selected pricing plan
 *  - Stripe payment (placeholder integration)
 *
 * Integration points:
 *  - POST /api/auth/signup   (create account)
 *  - POST /api/billing/checkout (Stripe checkout session)
 * ============================================================ */

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  CreditCard,
  User,
  Mail,
  Building,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";

/* ---- plan definitions ---- */

type Plan = {
  id: string;
  name: string;
  price: string;
  specs: string;
};

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: "$99/mo",
    specs: "4 vCPUs • 16 GB RAM • 500 GB storage",
  },
  {
    id: "professional",
    name: "Professional",
    price: "$299/mo",
    specs: "8 vCPUs • 32 GB RAM • 2 TB storage",
  },
];

/* ---- step definitions ---- */

type Step = "plan" | "account" | "payment";

export default function SignUpPage() {
  /* ---- step state ---- */
  const [step, setStep] = useState<Step>("plan");

  /* ---- plan selection ---- */
  const [selectedPlan, setSelectedPlan] = useState<string>("professional");

  /* ---- account details ---- */
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [organization, setOrganization] = useState("");

  /* ---- status ---- */
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ============================================================
   * Step navigation
   * ============================================================ */

  function goToAccount() {
    if (!selectedPlan) return;
    setStep("account");
  }

  function goToPayment() {
    if (!name.trim() || !email.trim() || password.length < 8) return;
    setStep("payment");
  }

  /* ============================================================
   * Submit — create account + redirect to Stripe checkout
   * ============================================================ */

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Create account
      const signupRes = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          organization,
          plan: selectedPlan,
        }),
      });

      const signupData = await signupRes.json();
      if (!signupRes.ok) {
        throw new Error(signupData.error || "Account creation failed");
      }

      // Step 2: Create Stripe checkout session
      const checkoutRes = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: signupData.accountId,
          plan: selectedPlan,
          email,
        }),
      });

      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) {
        throw new Error(checkoutData.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      if (checkoutData.url) {
        window.location.href = checkoutData.url;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* ============================================================
   * Step indicator
   * ============================================================ */

  const steps: { key: Step; label: string }[] = [
    { key: "plan", label: "Choose Plan" },
    { key: "account", label: "Account" },
    { key: "payment", label: "Payment" },
  ];

  const stepIndex = steps.findIndex((s) => s.key === step);

  return (
    <>
      <Navbar />

      <div className="min-h-screen flex items-center justify-center px-6 pt-16 pb-16">
        <div className="w-full max-w-lg space-y-8">
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
            <h1 className="text-2xl font-bold">Create your instance</h1>
            <p className="text-sm text-secondary">
              Set up a dedicated bioinformatics environment in minutes.
            </p>
          </div>

          {/* ---- step indicator ---- */}
          <div className="flex items-center justify-center gap-2">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center
                              text-xs font-semibold transition
                    ${
                      i < stepIndex
                        ? "bg-accent text-black"
                        : i === stepIndex
                        ? "bg-accent/20 text-accent border border-accent/40"
                        : "bg-secondary/10 text-secondary border border-secondary/20"
                    }
                  `}
                >
                  {i < stepIndex ? <Check size={14} /> : i + 1}
                </div>
                <span
                  className={`text-xs hidden sm:inline ${
                    i === stepIndex ? "text-foreground" : "text-secondary"
                  }`}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <div className="w-8 h-px bg-secondary/20 mx-1" />
                )}
              </div>
            ))}
          </div>

          {/* ============================================================
           * Step 1: Plan selection
           * ============================================================ */}
          {step === "plan" && (
            <div className="space-y-6">
              <div className="space-y-3">
                {PLANS.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full text-left rounded-xl border p-5 transition
                      ${
                        selectedPlan === plan.id
                          ? "border-accent bg-accent/5"
                          : "border-secondary/20 hover:border-secondary/40"
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{plan.name}</p>
                        <p className="text-sm text-secondary mt-1">
                          {plan.specs}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{plan.price}</p>
                        {selectedPlan === plan.id && (
                          <Check size={16} className="text-accent ml-auto mt-1" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}

                {/* Enterprise callout */}
                <div className="rounded-xl border border-secondary/10 p-5
                                text-center text-sm text-secondary">
                  Need more power?{" "}
                  <Link href="/contact" className="text-accent hover:text-foreground transition">
                    Contact us for Enterprise pricing
                  </Link>
                </div>
              </div>

              <button
                onClick={goToAccount}
                disabled={!selectedPlan}
                className="w-full flex items-center justify-center gap-2
                           bg-accent text-black py-3 rounded-lg
                           text-sm font-semibold transition
                           hover:brightness-110 hover:scale-[1.01]
                           disabled:opacity-50"
              >
                Continue <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* ============================================================
           * Step 2: Account details
           * ============================================================ */}
          {step === "account" && (
            <div className="space-y-6">
              {/* name */}
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary">
                    <User size={16} />
                  </div>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith"
                    autoFocus
                    className="w-full bg-transparent border border-secondary/30
                               rounded-lg pl-10 pr-4 py-3 text-sm
                               placeholder:text-secondary/50
                               focus:outline-none focus:border-accent transition"
                  />
                </div>
              </div>

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
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full bg-transparent border border-secondary/30
                               rounded-lg pl-10 pr-12 py-3 text-sm
                               placeholder:text-secondary/50
                               focus:outline-none focus:border-accent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2
                               text-secondary hover:text-foreground transition"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {password.length > 0 && password.length < 8 && (
                  <p className="text-xs text-amber-400">
                    Password must be at least 8 characters
                  </p>
                )}
              </div>

              {/* organization */}
              <div className="space-y-2">
                <label htmlFor="org" className="block text-sm font-medium">
                  Lab / Organization{" "}
                  <span className="text-secondary font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary">
                    <Building size={16} />
                  </div>
                  <input
                    id="org"
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="Knights Lab, University of Minnesota"
                    className="w-full bg-transparent border border-secondary/30
                               rounded-lg pl-10 pr-4 py-3 text-sm
                               placeholder:text-secondary/50
                               focus:outline-none focus:border-accent transition"
                  />
                </div>
              </div>

              {/* buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("plan")}
                  className="flex items-center gap-1 px-4 py-3 rounded-lg
                             text-sm text-secondary border border-secondary/30
                             transition hover:text-foreground hover:border-secondary/60"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={goToPayment}
                  disabled={!name.trim() || !email.trim() || password.length < 8}
                  className="flex-1 flex items-center justify-center gap-2
                             bg-accent text-black py-3 rounded-lg
                             text-sm font-semibold transition
                             hover:brightness-110 hover:scale-[1.01]
                             disabled:opacity-50"
                >
                  Continue to Payment <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ============================================================
           * Step 3: Payment / Stripe
           * ============================================================ */}
          {step === "payment" && (
            <div className="space-y-6">
              {/* order summary */}
              <div className="rounded-xl border border-secondary/20 p-5 space-y-3">
                <p className="text-sm font-semibold text-secondary uppercase tracking-wider">
                  Order Summary
                </p>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">
                      {PLANS.find((p) => p.id === selectedPlan)?.name} Plan
                    </p>
                    <p className="text-sm text-secondary">
                      {PLANS.find((p) => p.id === selectedPlan)?.specs}
                    </p>
                  </div>
                  <p className="font-bold text-lg">
                    {PLANS.find((p) => p.id === selectedPlan)?.price}
                  </p>
                </div>
                <div className="border-t border-secondary/10 pt-3 text-sm text-secondary">
                  <p>{name}</p>
                  <p>{email}</p>
                  {organization && <p>{organization}</p>}
                </div>
              </div>

              {/* stripe placeholder */}
              <div className="rounded-xl border border-secondary/20 p-5 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CreditCard size={16} className="text-accent" />
                  Payment Details
                </div>
                <p className="text-sm text-secondary">
                  You&apos;ll be redirected to Stripe&apos;s secure checkout to complete payment.
                  After payment, your instance will be provisioned and you&apos;ll receive
                  your access code via email.
                </p>

                <div className="rounded-lg bg-accent/5 border border-accent/20
                                p-3 text-xs text-accent">
                  🔒 All payments are processed securely through Stripe.
                  We never store your card details.
                </div>
              </div>

              {/* error */}
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/5
                                p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("account")}
                  className="flex items-center gap-1 px-4 py-3 rounded-lg
                             text-sm text-secondary border border-secondary/30
                             transition hover:text-foreground hover:border-secondary/60"
                >
                  <ArrowLeft size={14} /> Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2
                             bg-accent text-black py-3 rounded-lg
                             text-sm font-semibold transition
                             hover:brightness-110 hover:scale-[1.01]
                             disabled:opacity-50"
                >
                  {loading ? "Processing…" : "Proceed to Checkout"}
                  {!loading && <CreditCard size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* ---- footer links ---- */}
          <div className="text-center space-y-3 text-sm text-secondary">
            <p>
              Already have an instance?{" "}
              <Link
                href="/auth/signin"
                className="text-accent hover:text-foreground transition"
              >
                Sign in
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
