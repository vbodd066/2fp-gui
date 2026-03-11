/* ============================================================
 * GET /api/usage — authenticated usage summary
 * ============================================================
 * Returns the current billing period's usage metrics for the
 * authenticated user, including per-tool breakdowns, daily
 * time-series, and recent event history.
 *
 * Query params:
 *   ?from=2026-03-01T00:00:00Z  (optional, defaults to 1st of month)
 *   ?to=2026-03-31T23:59:59Z    (optional, defaults to now)
 * ============================================================ */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession, SESSION_COOKIE } from "@/lib/db/sessions";
import { getUsageSummary, getLifetimeCost } from "@/lib/db/usage";

export async function GET(req: NextRequest) {
  /* ---- auth ---- */
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = validateSession(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* ---- date range ---- */
  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  /* ---- query ---- */
  const summary = getUsageSummary(user.id, from, to);
  const lifetimeCostCents = getLifetimeCost(user.id);

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      role: user.role,
      organization: user.organization,
      created_at: user.created_at,
    },
    period: {
      from:
        from ??
        new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      to: to ?? new Date().toISOString(),
    },
    summary,
    lifetimeCostCents,
  });
}
