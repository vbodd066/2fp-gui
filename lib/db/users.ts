/* ============================================================
 * User repository — CRUD operations for the users table
 * ============================================================ */

import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

/* ---- types ---- */

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  organization: string;
  plan: string;
  role: "admin" | "user";
  stripe_customer_id: string | null;
  access_code: string | null;
  created_at: string;
  updated_at: string;
}

/** User data returned to the client (no password hash) */
export type SafeUser = Omit<User, "password_hash">;

/* ---- constants ---- */

const BCRYPT_ROUNDS = 12;

/* ---- queries ---- */

/**
 * Create a new user account.
 * Returns the created user (without password hash).
 * Throws if email already exists.
 */
export async function createUser(params: {
  email: string;
  password: string;
  name: string;
  organization?: string;
  plan?: string;
  role?: "admin" | "user";
}): Promise<SafeUser> {
  const id = randomUUID();
  const passwordHash = await bcrypt.hash(params.password, BCRYPT_ROUNDS);
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, organization, plan, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    params.email.toLowerCase().trim(),
    passwordHash,
    params.name.trim(),
    (params.organization ?? "").trim(),
    params.plan ?? "starter",
    params.role ?? "user",
    now,
    now
  );

  return findById(id)!;
}

/**
 * Find a user by email address.
 * Returns the full user row (including password_hash) for auth.
 */
export function findByEmail(email: string): User | null {
  const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
  return (stmt.get(email.toLowerCase().trim()) as User) ?? null;
}

/**
 * Find a user by ID.
 * Returns a safe user (no password hash).
 */
export function findById(id: string): SafeUser | null {
  const stmt = db.prepare(
    `SELECT id, email, name, organization, plan, role,
            stripe_customer_id, access_code, created_at, updated_at
     FROM users WHERE id = ?`
  );
  return (stmt.get(id) as SafeUser) ?? null;
}

/**
 * Verify a user's password.
 * Returns the safe user if valid, null otherwise.
 */
export async function verifyPassword(
  email: string,
  password: string
): Promise<SafeUser | null> {
  const user = findByEmail(email);
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return null;

  /* Strip password hash before returning */
  const { password_hash: _, ...safe } = user;
  return safe;
}

/**
 * Update a user's plan.
 */
export function updatePlan(userId: string, plan: string): void {
  const stmt = db.prepare(
    "UPDATE users SET plan = ?, updated_at = datetime('now') WHERE id = ?"
  );
  stmt.run(plan, userId);
}

/**
 * Update a user's Stripe customer ID.
 */
export function updateStripeCustomerId(
  userId: string,
  stripeCustomerId: string
): void {
  const stmt = db.prepare(
    "UPDATE users SET stripe_customer_id = ?, updated_at = datetime('now') WHERE id = ?"
  );
  stmt.run(stripeCustomerId, userId);
}

/**
 * Update a user's instance access code.
 */
export function updateAccessCode(userId: string, accessCode: string): void {
  const stmt = db.prepare(
    "UPDATE users SET access_code = ?, updated_at = datetime('now') WHERE id = ?"
  );
  stmt.run(accessCode, userId);
}

/**
 * Check if an email is already registered.
 */
export function emailExists(email: string): boolean {
  const stmt = db.prepare("SELECT 1 FROM users WHERE email = ?");
  return !!stmt.get(email.toLowerCase().trim());
}
