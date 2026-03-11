/* ============================================================
 * POST /api/auth/signup — account creation
 * ============================================================
 * PRD §4.2 — "User signs up → payment processed (Stripe) →
 * provision instance → receive URL + access code."
 *
 * Creates a real user account in the SQLite database with
 * a hashed password. The actual Stripe checkout is handled by
 * /api/billing/checkout.
 * ============================================================ */

import { NextRequest, NextResponse } from "next/server";
import { createUser, emailExists } from "@/lib/db/users";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, organization, plan } = body;

    /* ---- validation ---- */
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    /* Basic email format check */
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const validPlans = ["starter", "professional"];
    if (!plan || !validPlans.includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    /* ---- check for existing account ---- */
    if (emailExists(email)) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    /* ---- create account ---- */
    const user = await createUser({
      email,
      password,
      name,
      organization,
      plan,
    });

    console.log(
      `[signup] Account created: ${user.id} | ${name} | ${email} | plan=${plan}`
    );

    return NextResponse.json({
      ok: true,
      accountId: user.id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Account creation failed" },
      { status: 400 }
    );
  }
}
