/* ============================================================
 * GET /api/magus/output/download — serve an output file
 * ============================================================
 * Streams a single output file to the client as a download.
 *
 * Query params:
 *  - file: path to file (relative to jobs dir or absolute)
 *
 * Security: path is resolved and validated to be inside the
 * jobs directory to prevent directory traversal.
 * ============================================================ */

import { NextRequest, NextResponse } from "next/server";
import { createReadStream, existsSync, statSync } from "fs";
import path from "path";
import { Readable } from "stream";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get("file");

  if (!filePath) {
    return NextResponse.json(
      { error: "Missing 'file' query parameter" },
      { status: 400 }
    );
  }

  /* ---- resolve and validate path ---- */
  const jobsDir = path.join(process.cwd(), "jobs");
  const resolved = path.resolve(jobsDir, filePath);

  // Prevent directory traversal
  if (!resolved.startsWith(jobsDir)) {
    return NextResponse.json(
      { error: "Invalid file path" },
      { status: 403 }
    );
  }

  if (!existsSync(resolved)) {
    return NextResponse.json(
      { error: "File not found" },
      { status: 404 }
    );
  }

  const fileStat = statSync(resolved);
  if (!fileStat.isFile()) {
    return NextResponse.json(
      { error: "Not a file" },
      { status: 400 }
    );
  }

  /* ---- stream file to client ---- */
  const fileName = path.basename(resolved);
  const nodeStream = createReadStream(resolved);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": String(fileStat.size),
    },
  });
}
