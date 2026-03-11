/* ============================================================
 * Pricing — landing page pricing section
 * ============================================================
 * Shows pricing tiers for the per-customer instance model.
 * PRD §G5 — paid account model with usage-based billing.
 *
 * Note: Actual Stripe integration and pricing values are TBD.
 * These are placeholder tiers for the UI scaffold.
 * ============================================================ */

import Link from "next/link";
import { Check } from "lucide-react";

type PricingTier = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
};

const TIERS: PricingTier[] = [
  {
    name: "Starter",
    price: "$99",
    period: "/month",
    description:
      "For individual researchers running occasional analyses.",
    features: [
      "Dedicated EC2 instance",
      "XTree & MAGUS access",
      "4 vCPUs, 16 GB RAM",
      "500 GB EBS storage",
      "Shared access code",
      "Auto-sleep after 2h idle",
      "Email support",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$299",
    period: "/month",
    description:
      "For active labs running regular metagenomics workflows.",
    features: [
      "Everything in Starter",
      "8 vCPUs, 32 GB RAM",
      "2 TB EBS storage",
      "Custom subdomain",
      "Always-on option",
      "Priority support",
      "Usage dashboard",
    ],
    cta: "Get Started",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description:
      "For large teams and core facilities with high-throughput needs.",
    features: [
      "Everything in Professional",
      "Custom instance sizing",
      "Multiple instances",
      "Dedicated account manager",
      "SLA guarantees",
      "Custom integrations",
      "Volume discounts",
    ],
    cta: "Contact Us",
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* ---- section header ---- */}
        <div className="text-center space-y-4 mb-16">
          <p className="text-sm font-semibold text-accent uppercase tracking-wider">
            Pricing
          </p>
          <h2 className="text-3xl md:text-4xl font-bold">
            Simple, transparent pricing
          </h2>
          <p className="text-secondary max-w-2xl mx-auto">
            Each plan includes a fully dedicated AWS instance with all
            bioinformatics tools pre-installed. Pay monthly, cancel anytime.
          </p>
        </div>

        {/* ---- pricing cards ---- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl border p-8 space-y-6 transition
                ${
                  tier.highlighted
                    ? "border-accent/50 bg-accent/5 ring-1 ring-accent/20 scale-[1.02]"
                    : "border-secondary/15 hover:border-secondary/30"
                }
              `}
            >
              {/* badge */}
              {tier.highlighted && (
                <div className="text-xs font-semibold text-accent uppercase
                                tracking-wider">
                  Most Popular
                </div>
              )}

              {/* name + price */}
              <div>
                <h3 className="text-xl font-semibold">{tier.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  {tier.period && (
                    <span className="text-secondary text-sm">{tier.period}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-secondary">{tier.description}</p>
              </div>

              {/* features */}
              <ul className="space-y-3">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check
                      size={16}
                      className="text-accent shrink-0 mt-0.5"
                    />
                    <span className="text-secondary">{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={tier.name === "Enterprise" ? "/contact" : "/auth/signup"}
                className={`block text-center py-3 rounded-lg text-sm font-semibold
                            transition hover:scale-[1.02] active:scale-[0.98]
                  ${
                    tier.highlighted
                      ? "bg-accent text-black hover:brightness-110"
                      : "border border-secondary/30 text-secondary hover:text-foreground hover:border-secondary/60"
                  }
                `}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* ---- footnote ---- */}
        <p className="text-center text-xs text-secondary/60 mt-8">
          All prices in USD. Instances auto-sleep when idle to reduce costs.
          AWS compute costs are included in the plan price.
        </p>
      </div>
    </section>
  );
}
