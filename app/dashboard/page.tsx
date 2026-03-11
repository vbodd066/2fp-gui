/* ============================================================
 * Dashboard — account overview, usage metrics & billing
 * ============================================================
 * PRD §6.6 — Instance overview, status, usage metrics,
 * billing, access-code management, and lifecycle controls.
 *
 * Fetches real data from:
 *   - GET /api/auth/session  (user profile)
 *   - GET /api/usage         (compute usage & costs)
 * ============================================================ */

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  Clock,
  Cloud,
  CreditCard,
  HardDrive,
  Key,
  LogOut,
  Power,
  RefreshCw,
  Settings,
  SquareTerminal,
  Eye,
  EyeOff,
  Copy,
  Check,
  Cpu,
  TrendingUp,
  AlertCircle,
  User,
  Beaker,
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import { useAuth } from "@/lib/auth/AuthProvider";

/* ---- plan config ---- */

const PLAN_DETAILS: Record<string, {
  name: string;
  price: string;
  cpu: string;
  ram: string;
  storage: string;
  computeIncluded: string;
}> = {
  starter: {
    name: "Starter",
    price: "$99/mo",
    cpu: "4 vCPUs",
    ram: "16 GB",
    storage: "500 GB",
    computeIncluded: "100 hrs",
  },
  professional: {
    name: "Professional",
    price: "$299/mo",
    cpu: "8 vCPUs",
    ram: "32 GB",
    storage: "2 TB",
    computeIncluded: "500 hrs",
  },
};

/* ---- types ---- */

interface UsageData {
  user: {
    id: string;
    name: string;
    email: string;
    plan: string;
    role: string;
    organization: string;
    created_at: string;
  };
  period: { from: string; to: string };
  summary: {
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
    recentEvents: Array<{
      id: string;
      tool: string;
      stage: string;
      status: string;
      duration_ms: number;
      cpu_seconds: number;
      cost_cents: number;
      created_at: string;
    }>;
  };
  lifetimeCostCents: number;
}

/* ---- formatting helpers ---- */

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}m ${secs}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function formatCpuHours(cpuSeconds: number): string {
  const hours = cpuSeconds / 3600;
  if (hours < 1) return `${Math.round(cpuSeconds / 60)}m`;
  return `${hours.toFixed(1)}h`;
}

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h ago`;
  const minutes = Math.floor(diff / 60000);
  return `${minutes}m ago`;
}

/* ---- bar chart component ---- */

function UsageChart({ data }: { data: UsageData["summary"]["byDay"] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-secondary">
        No usage data this period
      </div>
    );
  }

  const maxCpu = Math.max(...data.map((d) => d.cpuSeconds), 1);

  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((day) => {
        const heightPct = Math.max((day.cpuSeconds / maxCpu) * 100, 2);
        return (
          <div
            key={day.date}
            className="flex-1 flex flex-col items-center gap-1 group"
          >
            <div className="relative w-full flex items-end justify-center"
                 style={{ height: "100px" }}>
              <div
                className="w-full max-w-6 bg-accent/60 rounded-t
                           transition-all group-hover:bg-accent"
                style={{ height: `${heightPct}%` }}
              />
              {/* tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block
                              bg-codeBg border border-secondary/20 rounded-lg
                              px-2 py-1 text-xs whitespace-nowrap z-10">
                <p className="font-semibold">{formatDate(day.date)}</p>
                <p>{day.jobs} job{day.jobs !== 1 ? "s" : ""}</p>
                <p>{formatCpuHours(day.cpuSeconds)} CPU</p>
                <p>{formatCost(day.costCents)}</p>
              </div>
            </div>
            <span className="text-[10px] text-secondary">
              {new Date(day.date).getDate()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
 * Main dashboard component
 * ============================================================ */

export default function DashboardPage() {
  const { user: authUser, signOut } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchUsage = useCallback(async () => {
    try {
      const res = await fetch("/api/usage");
      if (!res.ok) throw new Error("Failed to load usage data");
      const data = await res.json();
      setUsage(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  function copyAccessCode() {
    navigator.clipboard.writeText("real-access-code-here");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /* Derived data */
  const plan = PLAN_DETAILS[usage?.user?.plan ?? "starter"] ?? PLAN_DETAILS.starter;
  const summary = usage?.summary;
  const periodFrom = usage?.period?.from
    ? new Date(usage.period.from).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";
  const periodTo = usage?.period?.to
    ? new Date(usage.period.to).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  /* Loading */
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center gap-3 text-secondary">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent
                            rounded-full animate-spin" />
            <span className="text-sm">Loading dashboard…</span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div className="min-h-screen pt-20 pb-16 px-6">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* ============================================================
           * Header
           * ============================================================ */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-sm text-secondary mt-1">
                Welcome back, {authUser?.name ?? "User"}. Here&apos;s your instance overview.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/tools"
                className="flex items-center gap-2 bg-accent text-black
                           px-4 py-2 rounded-lg text-sm font-semibold
                           transition hover:brightness-110"
              >
                <SquareTerminal size={16} />
                Open Tools
              </Link>
              <button
                onClick={signOut}
                className="flex items-center gap-2 border border-secondary/30
                           px-4 py-2 rounded-lg text-sm text-secondary
                           transition hover:text-foreground hover:border-secondary/60"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>

          {/* ============================================================
           * Account & Plan
           * ============================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* account info */}
            <div className="rounded-xl border border-secondary/20 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center
                                justify-center text-accent font-bold text-lg">
                  {(authUser?.name ?? "U").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{authUser?.name}</p>
                  <p className="text-xs text-secondary">{authUser?.email}</p>
                </div>
              </div>
              {authUser?.organization && (
                <div className="text-sm text-secondary flex items-center gap-2">
                  <Cloud size={14} />
                  {authUser.organization}
                </div>
              )}
              {authUser?.role === "admin" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5
                                 rounded-full text-[10px] font-semibold uppercase
                                 tracking-wider bg-amber-500/10 text-amber-400
                                 border border-amber-500/20">
                  Admin
                </span>
              )}
              <div className="text-xs text-secondary">
                Member since {usage?.user?.created_at
                  ? new Date(usage.user.created_at).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </div>
            </div>

            {/* plan card */}
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard size={18} className="text-accent" />
                  <span className="font-semibold">Current Plan</span>
                </div>
                <span className="text-xl font-bold text-accent">{plan.price}</span>
              </div>
              <p className="text-lg font-bold">{plan.name}</p>
              <div className="grid grid-cols-2 gap-2 text-sm text-secondary">
                <span>{plan.cpu}</span>
                <span>{plan.ram}</span>
                <span>{plan.storage}</span>
                <span>{plan.computeIncluded} compute</span>
              </div>
              <Link
                href="/dashboard/billing"
                className="inline-flex items-center gap-1 text-xs text-accent
                           hover:text-foreground transition mt-2"
              >
                Manage plan →
              </Link>
            </div>

            {/* access code */}
            <div className="rounded-xl border border-secondary/20 p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Key size={18} className="text-accent" />
                <span className="font-semibold">Access Code</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">
                  {showCode ? "abc-123-xyz-789" : "••••••••••••"}
                </span>
                <button
                  onClick={() => setShowCode(!showCode)}
                  className="text-secondary hover:text-foreground transition"
                  title={showCode ? "Hide" : "Show"}
                >
                  {showCode ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  onClick={copyAccessCode}
                  className="text-secondary hover:text-foreground transition"
                  title="Copy"
                >
                  {copied ? (
                    <Check size={14} className="text-emerald-400" />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
              <p className="text-xs text-secondary">
                Share this code with team members who need access to your instance.
              </p>
              <button className="flex items-center gap-1.5 text-xs text-secondary
                                 hover:text-foreground transition mt-1">
                <RefreshCw size={12} /> Regenerate
              </button>
            </div>
          </div>

          {/* ============================================================
           * Billing Period & Key Metrics
           * ============================================================ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <BarChart3 size={18} className="text-accent" />
                Usage — Current Billing Period
              </h2>
              <span className="text-xs text-secondary">
                {periodFrom} — {periodTo}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* jobs run */}
              <div className="rounded-xl border border-secondary/20 p-5 space-y-2">
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <Activity size={14} />
                  Jobs Run
                </div>
                <p className="text-2xl font-bold">{summary?.totalJobs ?? 0}</p>
                <div className="flex gap-2 text-xs text-secondary">
                  <span className="text-emerald-400">
                    {summary?.completedJobs ?? 0} completed
                  </span>
                  {(summary?.failedJobs ?? 0) > 0 && (
                    <span className="text-red-400">
                      {summary?.failedJobs} failed
                    </span>
                  )}
                </div>
              </div>

              {/* compute time */}
              <div className="rounded-xl border border-secondary/20 p-5 space-y-2">
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <Cpu size={14} />
                  Compute Time
                </div>
                <p className="text-2xl font-bold">
                  {formatCpuHours(summary?.totalCpuSeconds ?? 0)}
                </p>
                <p className="text-xs text-secondary">
                  of {plan.computeIncluded} included
                </p>
                {/* usage bar */}
                <div className="w-full h-1.5 bg-secondary/10 rounded-full overflow-hidden">
                  {(() => {
                    const includedHrs = parseInt(plan.computeIncluded) || 100;
                    const usedHrs = (summary?.totalCpuSeconds ?? 0) / 3600;
                    const pct = Math.min((usedHrs / includedHrs) * 100, 100);
                    return (
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct > 80 ? "bg-amber-400" : "bg-accent"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    );
                  })()}
                </div>
              </div>

              {/* total cost this period */}
              <div className="rounded-xl border border-secondary/20 p-5 space-y-2">
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <TrendingUp size={14} />
                  Period Cost
                </div>
                <p className="text-2xl font-bold">
                  {formatCost(summary?.totalCostCents ?? 0)}
                </p>
                <p className="text-xs text-secondary">
                  compute usage charges
                </p>
              </div>

              {/* wall clock time */}
              <div className="rounded-xl border border-secondary/20 p-5 space-y-2">
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <Clock size={14} />
                  Wall Time
                </div>
                <p className="text-2xl font-bold">
                  {formatDuration(summary?.totalDurationMs ?? 0)}
                </p>
                <p className="text-xs text-secondary">
                  total execution time
                </p>
              </div>
            </div>
          </div>

          {/* ============================================================
           * Daily Usage Chart + Per-Tool Breakdown
           * ============================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* chart */}
            <div className="lg:col-span-2 rounded-xl border border-secondary/20 p-6 space-y-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <BarChart3 size={16} className="text-accent" />
                Daily Compute Usage
              </h3>
              <UsageChart data={summary?.byDay ?? []} />
            </div>

            {/* per-tool breakdown */}
            <div className="rounded-xl border border-secondary/20 p-6 space-y-4">
              <h3 className="font-semibold text-sm">Usage by Tool</h3>

              {!summary?.byTool || Object.keys(summary.byTool).length === 0 ? (
                <p className="text-sm text-secondary">No tools used yet this period.</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(summary.byTool).map(([tool, data]) => (
                    <div key={tool} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Beaker size={14} className="text-accent" />
                          <span className="text-sm font-semibold capitalize">{tool}</span>
                        </div>
                        <span className="text-xs text-secondary">
                          {data.jobs} job{data.jobs !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 text-xs text-secondary">
                        <span>CPU: {formatCpuHours(data.cpuSeconds)}</span>
                        <span>Cost: {formatCost(data.costCents)}</span>
                        <span>Time: {formatDuration(data.durationMs)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* lifetime cost */}
              <div className="border-t border-secondary/10 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary uppercase tracking-wider">
                    Lifetime Compute
                  </span>
                  <span className="text-sm font-bold">
                    {formatCost(usage?.lifetimeCostCents ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================
           * Recent Activity
           * ============================================================ */}
          <div className="rounded-xl border border-secondary/20 p-6 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Activity size={16} className="text-accent" />
              Recent Activity
            </h3>

            {!summary?.recentEvents || summary.recentEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-secondary">
                <Beaker size={32} className="mb-2 opacity-40" />
                <p className="text-sm">No jobs run yet.</p>
                <Link
                  href="/tools"
                  className="text-xs text-accent hover:text-foreground transition mt-1"
                >
                  Run your first analysis →
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-secondary uppercase tracking-wider border-b border-secondary/10">
                      <th className="text-left py-2 pr-4 font-medium">Tool</th>
                      <th className="text-left py-2 pr-4 font-medium">Stage</th>
                      <th className="text-left py-2 pr-4 font-medium">Status</th>
                      <th className="text-right py-2 pr-4 font-medium">Duration</th>
                      <th className="text-right py-2 pr-4 font-medium">CPU</th>
                      <th className="text-right py-2 pr-4 font-medium">Cost</th>
                      <th className="text-right py-2 font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary/5">
                    {summary.recentEvents.map((ev) => (
                      <tr key={ev.id} className="hover:bg-secondary/5 transition">
                        <td className="py-2.5 pr-4 capitalize font-medium">{ev.tool}</td>
                        <td className="py-2.5 pr-4 text-secondary">{ev.stage}</td>
                        <td className="py-2.5 pr-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5
                                        rounded-full text-xs font-medium
                              ${ev.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : ev.status === "failed"
                                ? "bg-red-500/10 text-red-400"
                                : "bg-secondary/10 text-secondary"
                              }`}
                          >
                            {ev.status === "completed" ? (
                              <Check size={10} />
                            ) : ev.status === "failed" ? (
                              <AlertCircle size={10} />
                            ) : null}
                            {ev.status}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-right text-secondary">
                          {formatDuration(ev.duration_ms)}
                        </td>
                        <td className="py-2.5 pr-4 text-right text-secondary">
                          {formatCpuHours(ev.cpu_seconds)}
                        </td>
                        <td className="py-2.5 pr-4 text-right font-mono text-xs">
                          {formatCost(ev.cost_cents)}
                        </td>
                        <td className="py-2.5 text-right text-xs text-secondary">
                          {timeAgo(ev.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ============================================================
           * Quick Actions
           * ============================================================ */}
          <div className="rounded-xl border border-secondary/20 p-6 space-y-4">
            <h2 className="font-semibold">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link
                href="/tools"
                className="flex items-center gap-3 p-4 rounded-lg
                           border border-secondary/10
                           transition hover:border-accent/40 hover:bg-accent/5"
              >
                <SquareTerminal size={20} className="text-accent" />
                <div>
                  <p className="text-sm font-semibold">Launch Tools</p>
                  <p className="text-xs text-secondary">
                    Run MAGUS or XTree analyses
                  </p>
                </div>
              </Link>

              <a
                href="https://github.com/two-frontiers-project"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-lg
                           border border-secondary/10
                           transition hover:border-accent/40 hover:bg-accent/5"
              >
                <Settings size={20} className="text-accent" />
                <div>
                  <p className="text-sm font-semibold">Documentation</p>
                  <p className="text-xs text-secondary">
                    Guides and API references
                  </p>
                </div>
              </a>

              <Link
                href="/dashboard/billing"
                className="flex items-center gap-3 p-4 rounded-lg
                           border border-secondary/10
                           transition hover:border-accent/40 hover:bg-accent/5"
              >
                <CreditCard size={20} className="text-accent" />
                <div>
                  <p className="text-sm font-semibold">Manage Billing</p>
                  <p className="text-xs text-secondary">
                    Update payment method or plan
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
