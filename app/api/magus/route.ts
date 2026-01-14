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

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    if (file.size > MAX_MAGUS_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large for MAGUS web interface" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // MAGUS web interface expects shotgun FASTQ
    validateSequenceFile(buffer, file.name);

    const tmpPath = path.join(
      process.cwd(),
      "tmp",
      "uploads",
      `magus-${Date.now()}-${file.name}`
    );

    await writeFile(tmpPath, buffer);

    const result = await runMAGUS(tmpPath);

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
    // Always release lock
    releaseJobLock();
  }
}
