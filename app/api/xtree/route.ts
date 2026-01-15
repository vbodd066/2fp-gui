import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { enqueueJob } from "@/lib/queue";

import { validateSequenceFile } from "@/lib/uploads/validate";
import {
  MAX_XTREE_UPLOAD_SIZE,
  ABSOLUTE_MAX_UPLOAD_SIZE,
} from "@/lib/uploads/limits";
import { sanitizeFilename } from "@/lib/uploads/sanitize";

type XTreeParams = {
  mode: "ALIGN" | "BUILD";
  global?: {
    threads?: number;
    logOut?: string;
  };
  align?: unknown;
  build?: unknown;
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    /* -------------------- files -------------------- */
    const files = formData.getAll("file");
    if (files.length !== 1) {
      throw new Error("Exactly one sequence file is required");
    }

    const seqFile = files[0];
    if (!(seqFile instanceof File)) {
      throw new Error("Invalid sequence file upload");
    }

    const mapFileRaw = formData.get("mapFile");
    const mapFile =
      mapFileRaw instanceof File && mapFileRaw.size > 0
        ? mapFileRaw
        : null;

    /* -------------------- email -------------------- */
    const email = formData.get("email");
    if (typeof email !== "string" || email.trim() === "") {
      throw new Error("Email address is required");
    }

    /* -------------------- size checks -------------------- */
    if (seqFile.size === 0) {
      throw new Error("Empty sequence file uploaded");
    }

    if (seqFile.size > ABSOLUTE_MAX_UPLOAD_SIZE) {
      throw new Error("File exceeds absolute maximum upload size");
    }

    if (seqFile.size > MAX_XTREE_UPLOAD_SIZE) {
      throw new Error("File too large for XTree web interface");
    }

    /* -------------------- read + validate sequence -------------------- */
    const seqBuffer = Buffer.from(await seqFile.arrayBuffer());
    validateSequenceFile(seqBuffer, seqFile.name);

    const mapBuffer =
      mapFile !== null
        ? Buffer.from(await mapFile.arrayBuffer())
        : null;

    /* -------------------- params -------------------- */
    const paramsRaw = formData.get("params");
    if (!paramsRaw) {
      throw new Error("Missing XTree parameters");
    }

    let params: XTreeParams;
    try {
      params = JSON.parse(String(paramsRaw));
    } catch {
      throw new Error("Invalid params JSON");
    }

    if (params.mode !== "ALIGN" && params.mode !== "BUILD") {
      throw new Error("Invalid XTree mode");
    }

    /* -------------------- job directory -------------------- */
    const jobId = randomUUID();
    const jobDir = path.join(process.cwd(), "jobs", jobId);
    const inputDir = path.join(jobDir, "input");

    await mkdir(inputDir, { recursive: true });

    /* -------------------- persist input files -------------------- */
    const safeSeqName = sanitizeFilename(seqFile.name);
    await writeFile(path.join(inputDir, safeSeqName), seqBuffer);

    if (mapFile && mapBuffer) {
      const safeMapName = sanitizeFilename(mapFile.name);
      await writeFile(path.join(inputDir, safeMapName), mapBuffer);
    }

    /* -------------------- persist params -------------------- */
    await writeFile(
      path.join(jobDir, "params.json"),
      JSON.stringify(params, null, 2)
    );

    /* -------------------- persist meta (FIX HERE) -------------------- */
    await writeFile(
      path.join(jobDir, "meta.json"),
      JSON.stringify(
        {
          id: jobId,
          tool: "xtree",
          mode: params.mode, // ✅ CRITICAL FIX
          email,
          createdAt: Date.now(),
        },
        null,
        2
      )
    );

    await writeFile(
      path.join(jobDir, "status.json"),
      JSON.stringify({ status: "queued" }, null, 2)
    );

    /* -------------------- enqueue -------------------- */
    await enqueueJob(jobId);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "XTree submission failed" },
      { status: 400 }
    );
  }
}
