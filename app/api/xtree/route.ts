import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { enqueueJob } from "@/lib/queue";

import { validateSequenceFile } from "@/lib/uploads/validate";
import { MAX_XTREE_FILE_SIZE } from "@/lib/uploads/limits";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const email = formData.get("email") as string | null;
    const paramsRaw = formData.get("params");

    if (!file) {
      throw new Error("No file uploaded");
    }

    if (!email) {
      throw new Error("Email address is required");
    }

    if (file.size > MAX_XTREE_FILE_SIZE) {
      throw new Error("File too large for XTree web interface");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
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
    await writeFile(path.join(jobDir, file.name), buffer);

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
    return NextResponse.json({ jobId });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "XTree submission failed" },
      { status: 400 }
    );
  }
}
