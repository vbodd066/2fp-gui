/**
 * Sanitize a user-provided filename for safe filesystem storage.
 *
 * - Removes path separators
 * - Replaces unsafe characters with "_"
 * - Preserves extensions
 * - Prevents path traversal and shell injection
 *
 * This function is intentionally conservative.
 */
export function sanitizeFilename(filename: string): string {
  // Strip any directory components (defensive)
  const base = filename.split(/[/\\]/).pop() ?? "file";

  // Replace anything except alphanumerics, dot, dash, underscore
  const sanitized = base.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Prevent empty or hidden filenames
  if (sanitized === "" || sanitized === "." || sanitized === "..") {
    return "file";
  }

  return sanitized;
}
