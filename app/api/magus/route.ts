import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

import { validateSequenceFile } from "@/lib/uploads/validate";
import { MAX_MAGUS_FILE_SIZE } from "@/lib/uploads/limits";
import { runMAGUS } from "@/lib/execution/runMAGUS";
import {
  acquireJobLock,
  releaseJobLock,
} from "@/lib/execution/jobLock";

export async function POST(req: NextRequest) {
  try {
    // Enforce single-job execution
    acquireJobLock();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const paramsRaw = formData.get("params");

    if (!file) {
      throw new Error("No file uploaded");
    }

    if (file.size > MAX_MAGUS_FILE_SIZE) {
      throw new Error("File too large for MAGUS web interface");
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Basic FASTQ / FASTA sanity validation
    validateSequenceFile(buffer, file.name);

    // ---- Parse and validate parameters ----
    const params: {
      preset: "eukaryote" | "balanced";
      minContig: number;
    } = {
      preset: "eukaryote",
      minContig: 1000,
    };

    if (paramsRaw) {
      const parsed = JSON.parse(String(paramsRaw));

      if (parsed.preset === "eukaryote" || parsed.preset === "balanced") {
        params.preset = parsed.preset;
      }

      if (
        typeof parsed.minContig === "number" &&
        parsed.minContig >= 500 &&
        parsed.minContig <= 10000
      ) {
        params.minContig = parsed.minContig;
      }
    }

    // ---- Write input to temp storage ----
    const tmpPath = path.join(
      process.cwd(),
      "tmp",
      "uploads",
      `magus-${Date.now()}-${file.name}`
    );

    await writeFile(tmpPath, buffer);

    // ---- Execute MAGUS ----
    const result = await runMAGUS(tmpPath, params);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "MAGUS execution failed" },
      { status: 500 }
    );
  } finally {
    // Always release job lock
    releaseJobLock();
  }
}
