/* ============================================================
 * Session repository — token-based session management
 * ============================================================
 * Sessions are stored in SQLite and linked to a user.
 * Each session has a cryptographically random token and an
 * expiration timestamp.
 * ============================================================ */

import { db } from "@/lib/db";
import { randomUUID, randomBytes } from "crypto";
import { findById, type SafeUser } from "@/lib/db/users";

/* ---- types ---- */

export interface Session {
  id: string;
  token: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

/* ---- constants ---- */

/** Default session lifetime: 30 days */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Cookie name used across the app */
export const SESSION_COOKIE = "2fp_session";

/** Cookie max age in seconds */
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

/* ---- queries ---- */

/**
 * Create a new session for a user.
 * Returns the session token (to be stored in a cookie).
 */
export function createSession(userId: string): string {
  const id = randomUUID();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  const stmt = db.prepare(`
    INSERT INTO sessions (id, token, user_id, expires_at)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(id, token, userId, expiresAt);

  return token;
}

/**
 * Validate a session token.
 * Returns the associated user if the session is valid and not
 * expired, or null otherwise.
 * Also cleans up the session if it has expired.
 */
export function validateSession(token: string): SafeUser | null {
  if (!token) return null;

  const stmt = db.prepare(
    "SELECT * FROM sessions WHERE token = ?"
  );
  const session = stmt.get(token) as Session | undefined;

  if (!session) return null;

  /* Check expiry */
  if (new Date(session.expires_at) < new Date()) {
    /* Expired — clean up */
    deleteSession(token);
    return null;
  }

  return findById(session.user_id);
}

/**
 * Delete a session by token (sign-out).
 */
export function deleteSession(token: string): void {
  const stmt = db.prepare("DELETE FROM sessions WHERE token = ?");
  stmt.run(token);
}

/**
 * Delete all sessions for a user (force sign-out everywhere).
 */
export function deleteUserSessions(userId: string): void {
  const stmt = db.prepare("DELETE FROM sessions WHERE user_id = ?");
  stmt.run(userId);
}

/**
 * Prune expired sessions from the database.
 * Call periodically to keep the table clean.
 */
export function deleteExpiredSessions(): number {
  const stmt = db.prepare(
    "DELETE FROM sessions WHERE expires_at < datetime('now')"
  );
  const result = stmt.run();
  return result.changes;
}
