/* ============================================================
 * POST /api/auth/signin — authentication
 * ============================================================
 * Supports two authentication modes:
 *
 * 1. Email + password — standard account login against the
 *    SQLite database.
 *
 * 2. Access code (PRD §G6) — legacy shared-password mode.
 *    Validates against INSTANCE_ACCESS_CODE env var and
 *    creates a session for the first user in the database
 *    (or rejects if no users exist).
 *
 * Both modes create a database-backed session and set a
 * secure httpOnly cookie with the session token.
 * ============================================================ */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { verifyPassword, findByEmail } from "@/lib/db/users";
import {
  createSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/db/sessions";
import { db } from "@/lib/db";

/* ---- route ---- */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, accessCode } = body;

    let userId: string;

    if (email && password) {
      /* ============================================================
       * Mode 1: Email + password authentication
       * ============================================================ */
      const user = await verifyPassword(email, password);

      if (!user) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }

      userId = user.id;
    } else if (accessCode) {
      /* ============================================================
       * Mode 2: Access-code authentication (legacy)
       * ============================================================ */
      const instanceCode = process.env.INSTANCE_ACCESS_CODE;

      if (!instanceCode) {
        return NextResponse.json(
          { error: "Instance not configured. Contact your administrator." },
          { status: 500 }
        );
      }

      /* Constant-time comparison */
      const codeBuffer = Buffer.from(accessCode.trim());
      const expectedBuffer = Buffer.from(instanceCode.trim());

      if (
        codeBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(codeBuffer, expectedBuffer)
      ) {
        return NextResponse.json(
          { error: "Invalid access code" },
          { status: 401 }
        );
      }

      /* Find the owner / first user to attach the session to */
      const firstUser = db
        .prepare("SELECT id FROM users ORDER BY created_at ASC LIMIT 1")
        .get() as { id: string } | undefined;

      if (!firstUser) {
        return NextResponse.json(
          { error: "No accounts exist. Please sign up first." },
          { status: 401 }
        );
      }

      userId = firstUser.id;
    } else {
      return NextResponse.json(
        { error: "Provide email + password, or an access code." },
        { status: 400 }
      );
    }

    /* ---- create session & set cookie ---- */
    const token = createSession(userId);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Sign in failed" },
      { status: 400 }
    );
  }
}
