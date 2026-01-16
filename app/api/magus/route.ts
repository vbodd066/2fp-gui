import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { enqueueJob } from "@/lib/queue";

import { validateSequenceFile } from "@/lib/uploads/validate";
import {
  MAX_MAGUS_UPLOAD_SIZE,
  ABSOLUTE_MAX_UPLOAD_SIZE,
} from "@/lib/uploads/limits";
import { sanitizeFilename } from "@/lib/uploads/sanitize";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    /* -------------------- file -------------------- */
    const files = formData.getAll("file");
    if (files.length !== 1) {
      throw new Error("Exactly one input file is required");
    }

    const seqFile = files[0];
    if (!(seqFile instanceof File)) {
      throw new Error("Invalid file upload");
    }

    /* -------------------- email -------------------- */
    const email = formData.get("email");
    if (typeof email !== "string" || email.trim() === "") {
      throw new Error("Email address is required");
    }

    /* -------------------- size checks -------------------- */
    if (seqFile.size === 0) {
      throw new Error("Empty file uploaded");
    }

    if (seqFile.size > ABSOLUTE_MAX_UPLOAD_SIZE) {
      throw new Error("File exceeds absolute maximum upload size");
    }

    if (seqFile.size > MAX_MAGUS_UPLOAD_SIZE) {
      throw new Error("File too large for MAGUS web interface");
    }

    /* -------------------- read + validate sequence -------------------- */
    const seqBuffer = Buffer.from(await seqFile.arrayBuffer());
    validateSequenceFile(seqBuffer, seqFile.name);

    /* -------------------- params (workflow JSON) -------------------- */
    const paramsRaw = formData.get("params");
    if (!paramsRaw) {
      throw new Error("Missing MAGUS workflow parameters");
    }

    let params: unknown;
    try {
      params = JSON.parse(String(paramsRaw));
    } catch {
      throw new Error("Invalid MAGUS params JSON");
    }

    /* -------------------- job directory -------------------- */
    const jobId = randomUUID();
    const jobDir = path.join(process.cwd(), "jobs", jobId);
    const inputDir = path.join(jobDir, "input");

    await mkdir(inputDir, { recursive: true });

    /* -------------------- persist input -------------------- */
    const safeFilename = sanitizeFilename(seqFile.name);
    await writeFile(path.join(inputDir, safeFilename), seqBuffer);

    /* -------------------- persist params -------------------- */
    await writeFile(
      path.join(jobDir, "params.json"),
      JSON.stringify(params, null, 2)
    );

    /* -------------------- persist metadata -------------------- */
    await writeFile(
      path.join(jobDir, "meta.json"),
      JSON.stringify(
        {
          id: jobId,
          tool: "magus",
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
      { error: err?.message ?? "MAGUS submission failed" },
      { status: 400 }
    );
  }
}
