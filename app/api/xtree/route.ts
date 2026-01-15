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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // ---- Enforce exactly one file ----
    const files = formData.getAll("file");
    if (files.length !== 1) {
      throw new Error("Exactly one input file is required");
    }

    const file = files[0];
    if (!(file instanceof File)) {
      throw new Error("Invalid file upload");
    }

    const email = formData.get("email");
    if (typeof email !== "string" || email.trim() === "") {
      throw new Error("Email address is required");
    }

    // ---- File size checks ----
    if (file.size === 0) {
      throw new Error("Empty file uploaded");
    }

    if (file.size > ABSOLUTE_MAX_UPLOAD_SIZE) {
      throw new Error("File exceeds absolute maximum upload size");
    }

    if (file.size > MAX_XTREE_UPLOAD_SIZE) {
      throw new Error("File too large for XTree web interface");
    }

    // ---- Read file buffer ----
    const buffer = Buffer.from(await file.arrayBuffer());

    // ---- Validate sequence content ----
    validateSequenceFile(buffer, file.name);

    // ---- Parse and validate parameters ----
    const params: {
      db: "gtdb" | "refseq";
      readType: "short" | "long";
      sensitivity: "standard" | "high";
    } = {
      db: "gtdb",
      readType: "short",
      sensitivity: "standard",
    };

    const paramsRaw = formData.get("params");
    if (paramsRaw) {
      const parsed = JSON.parse(String(paramsRaw));

      if (parsed.db === "gtdb" || parsed.db === "refseq") {
        params.db = parsed.db;
      }

      if (parsed.readType === "short" || parsed.readType === "long") {
        params.readType = parsed.readType;
      }

      if (parsed.sensitivity === "standard" || parsed.sensitivity === "high") {
        params.sensitivity = parsed.sensitivity;
      }
    }

    // ---- Create job directory ----
    const jobId = randomUUID();
    const jobDir = path.join(process.cwd(), "jobs", jobId);
    await mkdir(jobDir, { recursive: true });

    // ---- Persist job artifacts ----
    const safeFilename = sanitizeFilename(file.name);

    await writeFile(path.join(jobDir, safeFilename), buffer);

    await writeFile(
      path.join(jobDir, "params.json"),
      JSON.stringify(params, null, 2)
    );

    await writeFile(
      path.join(jobDir, "meta.json"),
      JSON.stringify(
        {
          id: jobId,
          tool: "xtree",
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

    // ---- IMPORTANT: no execution here ----
    await enqueueJob(jobId);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "XTree submission failed" },
      { status: 400 }
    );
  }
}
