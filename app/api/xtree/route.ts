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

/* ------------------------------------------------------------
 * Types (frontend contract)
 * ------------------------------------------------------------ */

type StageKey =
  | "input"
  | "preprocessing"
  | "assembly"
  | "taxonomy"
  | "specialized"
  | "annotation"
  | "phylogeny";

type StageState = {
  enabled: boolean;
  config: any;
};

type MagusParams = {
  stages: Record<StageKey, StageState>;
};

/* ------------------------------------------------------------
 * POST /api/magus
 * ------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    /* -------------------- input file -------------------- */

    const files = formData.getAll("file");
    if (files.length !== 1) {
      throw new Error("Exactly one input sequence file is required");
    }

    const file = files[0];
    if (!(file instanceof File)) {
      throw new Error("Invalid file upload");
    }

    if (file.size === 0) {
      throw new Error("Empty file uploaded");
    }

    if (file.size > ABSOLUTE_MAX_UPLOAD_SIZE) {
      throw new Error("File exceeds absolute maximum upload size");
    }

    if (file.size > MAX_MAGUS_UPLOAD_SIZE) {
      throw new Error("File too large for MAGUS web interface");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    validateSequenceFile(buffer, file.name);

    /* -------------------- email -------------------- */

    const email = formData.get("email");
    if (typeof email !== "string" || email.trim() === "") {
      throw new Error("Email address is required");
    }

    /* -------------------- params -------------------- */

    const paramsRaw = formData.get("params");
    if (!paramsRaw) {
      throw new Error("Missing MAGUS workflow parameters");
    }

    let params: MagusParams;
    try {
      params = JSON.parse(String(paramsRaw));
    } catch {
      throw new Error("Invalid params JSON");
    }

    if (
      typeof params !== "object" ||
      params === null ||
      typeof params.stages !== "object"
    ) {
      throw new Error("Invalid MAGUS workflow structure");
    }

    /* -------------------- job directory -------------------- */

    const jobId = randomUUID();
    const jobDir = path.join(process.cwd(), "jobs", jobId);
    const inputDir = path.join(jobDir, "input");

    await mkdir(inputDir, { recursive: true });

    /* -------------------- persist input file -------------------- */

    const safeFilename = sanitizeFilename(file.name);
    await writeFile(path.join(inputDir, safeFilename), buffer);

    /* -------------------- persist params -------------------- */

    await writeFile(
      path.join(jobDir, "params.json"),
      JSON.stringify(params, null, 2)
    );

    /* -------------------- persist meta -------------------- */

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

    /* -------------------- persist status -------------------- */

    await writeFile(
      path.join(jobDir, "status.json"),
      JSON.stringify({ status: "queued" }, null, 2)
    );

    /* -------------------- enqueue job -------------------- */

    await enqueueJob(jobId);

    return NextResponse.json({ ok: true, id: jobId });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "MAGUS submission failed" },
      { status: 400 }
    );
  }
}
