/* ============================================================
 * Seed script — creates the admin user for dev / testing
 * ============================================================
 * Usage:
 *   npm run db:seed
 *
 * Set ADMIN_EMAIL and ADMIN_PASSWORD via environment variables
 * or .env file to override the defaults below.
 *
 * Safe to run multiple times — skips if the admin already exists.
 * ============================================================ */

import "dotenv/config";
import { getDb } from "../lib/db";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

/* ---- defaults (override via env) ---- */

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "admin@2fp.bio").toLowerCase().trim();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin1234";
const ADMIN_NAME = process.env.ADMIN_NAME ?? "Admin";

const BCRYPT_ROUNDS = 12;

async function seed() {
  const db = getDb();

  /* Check if admin already exists */
  const existing = db
    .prepare("SELECT id, email, role FROM users WHERE email = ?")
    .get(ADMIN_EMAIL) as { id: string; email: string; role: string } | undefined;

  if (existing) {
    /* Make sure the existing user has admin role */
    if (existing.role !== "admin") {
      db.prepare("UPDATE users SET role = 'admin', updated_at = datetime('now') WHERE id = ?")
        .run(existing.id);
      console.log(`✅ Promoted existing user ${ADMIN_EMAIL} to admin`);
    } else {
      console.log(`ℹ️  Admin user ${ADMIN_EMAIL} already exists — skipping`);
    }
    return;
  }

  /* Create admin user */
  const id = randomUUID();
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, organization, plan, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    ADMIN_EMAIL,
    passwordHash,
    ADMIN_NAME,
    "Two Frontiers Project",
    "professional",
    "admin",
    now,
    now
  );

  console.log(`✅ Admin user created`);
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   Plan:     professional`);
  console.log(`   Role:     admin`);
  console.log(`\n   Change credentials via ADMIN_EMAIL / ADMIN_PASSWORD env vars.`);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
