import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

import { validateSequenceFile } from "@/lib/uploads/validate";
import { MAX_XTREE_FILE_SIZE } from "@/lib/uploads/limits";
import { runXTree } from "@/lib/execution/runXtree";
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

    if (file.size > MAX_XTREE_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large for XTree web interface" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Safety validation (FASTA / FASTQ only)
    validateSequenceFile(buffer, file.name);

    const tmpPath = path.join(
      process.cwd(),
      "tmp",
      "uploads",
      `xtree-${Date.now()}-${file.name}`
    );

    await writeFile(tmpPath, buffer);

    const result = await runXTree(tmpPath);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "XTree execution failed" },
      { status: 500 }
    );
  } finally {
    // Always release lock, even on error
    releaseJobLock();
  }
}
