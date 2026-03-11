/* ============================================================
 * Usage repository — track & query compute/storage usage
 * ============================================================
 * Records per-stage execution events with duration, CPU time,
 * storage, and estimated cost. Provides summary aggregations
 * for the dashboard.
 * ============================================================ */

import { db } from "@/lib/db";
import { randomUUID } from "crypto";

/* ---- types ---- */

export interface UsageEvent {
  id: string;
  user_id: string;
  tool: string;       // "magus" | "xtree"
  stage: string;       // e.g. "preprocessing", "assembly"
  status: string;      // "completed" | "failed" | "cancelled"
  duration_ms: number;
  cpu_seconds: number;
  storage_bytes: number;
  cost_cents: number;
  metadata: string;    // JSON blob for extra info
  created_at: string;
}

export interface UsageSummary {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalDurationMs: number;
  totalCpuSeconds: number;
  totalStorageBytes: number;
  totalCostCents: number;
  byTool: Record<string, {
    jobs: number;
    durationMs: number;
    cpuSeconds: number;
    costCents: number;
  }>;
  byDay: Array<{
    date: string;
    jobs: number;
    cpuSeconds: number;
    costCents: number;
  }>;
  recentEvents: UsageEvent[];
}

/* ---- pricing (cents) ---- */

/** Per-CPU-second cost in cents — $0.0001/cpu-sec ≈ $0.36/cpu-hour */
const CPU_COST_PER_SEC = 0.01;

/** Per-GB-stored-per-month cost in cents — $0.023/GB/month */
const STORAGE_COST_PER_GB = 2.3;

/* ---- commands ---- */

/**
 * Record a usage event (called when a stage completes).
 */
export function recordUsageEvent(params: {
  userId: string;
  tool: string;
  stage: string;
  status?: string;
  durationMs: number;
  cpuSeconds?: number;
  storageBytes?: number;
  metadata?: Record<string, unknown>;
}): UsageEvent {
  const id = randomUUID();
  const cpuSeconds = params.cpuSeconds ?? params.durationMs / 1000;
  const storageBytes = params.storageBytes ?? 0;

  /* Estimate cost */
  const cpuCost = Math.round(cpuSeconds * CPU_COST_PER_SEC);
  const storageCost = Math.round(
    (storageBytes / (1024 ** 3)) * STORAGE_COST_PER_GB
  );
  const costCents = cpuCost + storageCost;

  const stmt = db.prepare(`
    INSERT INTO usage_events
      (id, user_id, tool, stage, status, duration_ms, cpu_seconds,
       storage_bytes, cost_cents, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    params.userId,
    params.tool,
    params.stage,
    params.status ?? "completed",
    params.durationMs,
    cpuSeconds,
    storageBytes,
    costCents,
    JSON.stringify(params.metadata ?? {}),
  );

  return {
    id,
    user_id: params.userId,
    tool: params.tool,
    stage: params.stage,
    status: params.status ?? "completed",
    duration_ms: params.durationMs,
    cpu_seconds: cpuSeconds,
    storage_bytes: storageBytes,
    cost_cents: costCents,
    metadata: JSON.stringify(params.metadata ?? {}),
    created_at: new Date().toISOString(),
  };
}

/* ---- queries ---- */

/**
 * Get a comprehensive usage summary for a user within a date range.
 * Defaults to the current calendar month.
 */
export function getUsageSummary(
  userId: string,
  from?: string,
  to?: string,
): UsageSummary {
  const periodStart =
    from ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString();
  const periodEnd = to ?? new Date().toISOString();

  /* Totals */
  const totals = db.prepare(`
    SELECT
      COUNT(*)                          AS total_jobs,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN status = 'failed'    THEN 1 ELSE 0 END) AS failed,
      COALESCE(SUM(duration_ms), 0)     AS duration_ms,
      COALESCE(SUM(cpu_seconds), 0)     AS cpu_seconds,
      COALESCE(SUM(storage_bytes), 0)   AS storage_bytes,
      COALESCE(SUM(cost_cents), 0)      AS cost_cents
    FROM usage_events
    WHERE user_id = ? AND created_at >= ? AND created_at <= ?
  `).get(userId, periodStart, periodEnd) as any;

  /* By tool */
  const toolRows = db.prepare(`
    SELECT
      tool,
      COUNT(*)                        AS jobs,
      COALESCE(SUM(duration_ms), 0)   AS duration_ms,
      COALESCE(SUM(cpu_seconds), 0)   AS cpu_seconds,
      COALESCE(SUM(cost_cents), 0)    AS cost_cents
    FROM usage_events
    WHERE user_id = ? AND created_at >= ? AND created_at <= ?
    GROUP BY tool
  `).all(userId, periodStart, periodEnd) as any[];

  const byTool: UsageSummary["byTool"] = {};
  for (const row of toolRows) {
    byTool[row.tool] = {
      jobs: row.jobs,
      durationMs: row.duration_ms,
      cpuSeconds: row.cpu_seconds,
      costCents: row.cost_cents,
    };
  }

  /* By day (last 30 days) */
  const byDay = db.prepare(`
    SELECT
      DATE(created_at) AS date,
      COUNT(*)                        AS jobs,
      COALESCE(SUM(cpu_seconds), 0)   AS cpu_seconds,
      COALESCE(SUM(cost_cents), 0)    AS cost_cents
    FROM usage_events
    WHERE user_id = ? AND created_at >= ? AND created_at <= ?
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `).all(userId, periodStart, periodEnd) as any[];

  /* Recent events (last 20) */
  const recentEvents = db.prepare(`
    SELECT * FROM usage_events
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(userId) as UsageEvent[];

  return {
    totalJobs: totals.total_jobs ?? 0,
    completedJobs: totals.completed ?? 0,
    failedJobs: totals.failed ?? 0,
    totalDurationMs: totals.duration_ms ?? 0,
    totalCpuSeconds: totals.cpu_seconds ?? 0,
    totalStorageBytes: totals.storage_bytes ?? 0,
    totalCostCents: totals.cost_cents ?? 0,
    byTool,
    byDay,
    recentEvents,
  };
}

/**
 * Get all-time total cost for a user (for lifetime display).
 */
export function getLifetimeCost(userId: string): number {
  const row = db.prepare(
    "SELECT COALESCE(SUM(cost_cents), 0) AS total FROM usage_events WHERE user_id = ?"
  ).get(userId) as { total: number };
  return row.total;
}
