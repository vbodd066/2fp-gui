// ===============================
// Upload size limits (bytes)
// ===============================

export const MAX_XTREE_UPLOAD_SIZE = 500 * 1024 * 1024; // 500 MB
export const MAX_MAGUS_UPLOAD_SIZE = 200 * 1024 * 1024; // 200 MB

// Absolute hard caps (never exceed)
export const ABSOLUTE_MAX_UPLOAD_SIZE = 1 * 1024 * 1024 * 1024; // 1 GB

// ===============================
// Execution limits
// ===============================

export const MAX_CONCURRENT_JOBS = 1;

// ===============================
// Timeouts (ms)
// ===============================

export const XTREE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const MAGUS_TIMEOUT_MS = 60 * 60 * 1000; // 60 minutes
export const ABSOLUTE_MAX_RUNTIME_MS = 4 * 60 * 60 * 1000; // 4 hours

// ===============================
// Safety assertions
// ===============================

if (MAX_XTREE_UPLOAD_SIZE > ABSOLUTE_MAX_UPLOAD_SIZE) {
  throw new Error("XTREE upload limit exceeds absolute maximum");
}

if (MAX_MAGUS_UPLOAD_SIZE > ABSOLUTE_MAX_UPLOAD_SIZE) {
  throw new Error("MAGUS upload limit exceeds absolute maximum");
}

if (XTREE_TIMEOUT_MS > ABSOLUTE_MAX_RUNTIME_MS) {
  throw new Error("XTREE timeout exceeds absolute maximum");
}

if (MAGUS_TIMEOUT_MS > ABSOLUTE_MAX_RUNTIME_MS) {
  throw new Error("MAGUS timeout exceeds absolute maximum");
}
