/* ============================================================
 * GET /api/auth/session — validate session & return user info
 * ============================================================
 * Reads the session token from the cookie, validates it
 * against the database, and returns the authenticated user's
 * profile (no password hash).
 * ============================================================ */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession, SESSION_COOKIE } from "@/lib/db/sessions";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false });
  }

  const user = validateSession(token);

  if (!user) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      organization: user.organization,
      plan: user.plan,
      role: user.role,
    },
  });
}
