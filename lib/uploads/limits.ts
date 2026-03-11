/* ============================================================
 * Upload & execution limits — instance-local deployment
 * ============================================================
 * PRD §5.3 — "since each instance is dedicated, the current
 * artificial upload/concurrency caps can be relaxed."
 *
 * These are safety rails, not hard restrictions. Each customer
 * runs on their own EC2 instance so we can be generous.
 * ============================================================ */

// ===============================
// Upload size limits (bytes)
// ===============================

export const MAX_XTREE_UPLOAD_SIZE  = 10 * 1024 * 1024 * 1024;  // 10 GB
export const MAX_MAGUS_UPLOAD_SIZE  = 10 * 1024 * 1024 * 1024;  // 10 GB

// Absolute hard cap (prevent accidental abuse)
export const ABSOLUTE_MAX_UPLOAD_SIZE = 50 * 1024 * 1024 * 1024; // 50 GB

// ===============================
// Timeouts (ms)
// ===============================

export const XTREE_TIMEOUT_MS        =  4 * 60 * 60 * 1000; //  4 hours
export const MAGUS_TIMEOUT_MS        = 24 * 60 * 60 * 1000; // 24 hours
export const ABSOLUTE_MAX_RUNTIME_MS = 72 * 60 * 60 * 1000; // 72 hours
