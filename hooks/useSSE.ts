/* ============================================================
 * useSSE — Server-Sent Events hook for streaming execution
 * ============================================================
 * Generic SSE client that:
 *  - POSTs to an API route (with JSON or FormData body)
 *  - Reads the SSE text/event-stream response
 *  - Dispatches typed callbacks for each event type
 *  - Supports abort via AbortController
 *
 * Integration points:
 *  - POST /api/magus/run     (single stage, see PRD §6.5)
 *  - POST /api/magus/run-all (sequential stages)
 *  - POST /api/xtree/run     (XTree execution)
 *
 * This is a POST-based SSE pattern (not EventSource, which
 * only supports GET). We read the stream manually via fetch().
 * ============================================================ */

"use client";

import { useCallback, useRef, useState } from "react";

/* -------------------- types -------------------- */

type SSECallbacks = {
  /** Called for each parsed SSE event. */
  onEvent: (event: string, data: any) => void;
  /** Called when the stream ends (connection closed). */
  onDone?: () => void;
  /** Called on network or parse error. */
  onError?: (error: Error) => void;
};

type SSEOptions = {
  /** API endpoint URL. */
  url: string;
  /** Request body — JSON object or FormData. */
  body: Record<string, any> | FormData;
  /** SSE event callbacks. */
  callbacks: SSECallbacks;
};

/* -------------------- hook -------------------- */

/**
 * Returns `{ start, abort, isStreaming }`.
 *
 * Usage:
 * ```ts
 * const { start, abort, isStreaming } = useSSE();
 * start({
 *   url: "/api/magus/run",
 *   body: { stage: "preprocessing", config: { ... } },
 *   callbacks: {
 *     onEvent(event, data) { … },
 *     onDone() { … },
 *     onError(err) { … },
 *   },
 * });
 * ```
 */
export function useSSE() {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const start = useCallback(async (opts: SSEOptions) => {
    // Abort any existing stream first
    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);

    try {
      const isFormData = opts.body instanceof FormData;
      const fetchBody: BodyInit = isFormData
        ? (opts.body as FormData)
        : JSON.stringify(opts.body);

      const res = await fetch(opts.url, {
        method: "POST",
        headers: isFormData ? undefined : { "Content-Type": "application/json" },
        body: fetchBody,
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      if (!res.body) {
        throw new Error("Response body is null — SSE not supported");
      }

      // Read the SSE stream line by line
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "message"; // default SSE event type

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // keep incomplete last line in buffer

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const raw = line.slice(6);
            try {
              const data = JSON.parse(raw);
              opts.callbacks.onEvent(currentEvent, data);
            } catch {
              // Non-JSON data line — pass raw string
              opts.callbacks.onEvent(currentEvent, { raw });
            }
            currentEvent = "message"; // reset after data
          }
          // Blank lines and comments (":") are ignored per SSE spec
        }
      }

      opts.callbacks.onDone?.();
    } catch (err: any) {
      if (err.name === "AbortError") {
        // User-initiated abort — not an error
        return;
      }
      opts.callbacks.onError?.(err);
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, []);

  return { start, abort, isStreaming };
}
