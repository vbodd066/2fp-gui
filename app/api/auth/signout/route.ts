/* ============================================================
 * POST /api/auth/signout — destroy session & clear cookie
 * ============================================================ */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession, SESSION_COOKIE } from "@/lib/db/sessions";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  /* Delete session from the database */
  if (token) {
    deleteSession(token);
  }

  /* Clear the cookie */
  cookieStore.delete(SESSION_COOKIE);

  return NextResponse.json({ ok: true });
}
