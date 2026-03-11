/* ============================================================
 * POST /api/billing/checkout — Create Stripe checkout session
 * ============================================================
 * PRD §G5 — Stripe integration for billing.
 *
 * Stub implementation that returns a placeholder URL.
 * Replace with real Stripe SDK calls when ready:
 *   npm install stripe
 *   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
 * ============================================================ */

import { NextRequest, NextResponse } from "next/server";

/* ---- price IDs (to be replaced with real Stripe price IDs) ---- */

const PLAN_PRICES: Record<string, { priceId: string; name: string }> = {
  starter: {
    priceId: "price_starter_placeholder",
    name: "Starter",
  },
  professional: {
    priceId: "price_professional_placeholder",
    name: "Professional",
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accountId, plan, email } = body;

    if (!accountId || !plan || !email) {
      return NextResponse.json(
        { error: "Missing required fields: accountId, plan, email" },
        { status: 400 }
      );
    }

    const planConfig = PLAN_PRICES[plan];
    if (!planConfig) {
      return NextResponse.json(
        { error: "Invalid plan" },
        { status: 400 }
      );
    }

    /* ============================================================
     * TODO: Replace this stub with real Stripe checkout
     *
     * const session = await stripe.checkout.sessions.create({
     *   mode: "subscription",
     *   customer_email: email,
     *   line_items: [{ price: planConfig.priceId, quantity: 1 }],
     *   success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
     *   cancel_url: `${process.env.NEXT_PUBLIC_URL}/auth/signup`,
     *   metadata: { accountId, plan },
     * });
     *
     * return NextResponse.json({ url: session.url });
     * ============================================================ */

    console.log(
      `[billing] Checkout requested: account=${accountId} plan=${plan} email=${email}`
    );

    // Stub: redirect to dashboard with a fake session
    const stubUrl = `/dashboard?setup=complete&plan=${plan}`;

    return NextResponse.json({ url: stubUrl });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Checkout failed" },
      { status: 400 }
    );
  }
}
