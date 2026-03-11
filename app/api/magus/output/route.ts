/* ============================================================
 * GET /api/magus/output?stage=<key>&runId=<id> — list output
 * ============================================================
 * PRD §6.5 — "GET /api/magus/output?stage=preprocessing"
 *
 * Returns the list of output files for a given stage.
 * ============================================================ */

import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage");
  const runId = searchParams.get("runId");

  if (!stage || !runId) {
    return NextResponse.json(
      { error: "Missing 'stage' and/or 'runId' query parameter" },
      { status: 400 }
    );
  }

  const outputDir = path.join(
    process.cwd(),
    "jobs",
    runId,
    "output",
    stage
  );

  try {
    const entries = await readdir(outputDir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const filePath = path.join(outputDir, entry.name);
      const fileStat = await stat(filePath);
      files.push({
        name: entry.name,
        size: fileStat.size,
        path: `/api/magus/output/download?runId=${runId}&stage=${stage}&file=${encodeURIComponent(entry.name)}`,
      });
    }

    return NextResponse.json({ files });
  } catch {
    return NextResponse.json({ files: [] });
  }
}
