import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { enqueueJob } from "@/lib/queue";

import { validateSequenceFile } from "@/lib/uploads/validate";
import { MAX_MAGUS_FILE_SIZE } from "@/lib/uploads/limits";

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

    if (file.size > MAX_MAGUS_FILE_SIZE) {
      throw new Error("File too large for MAGUS web interface");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
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

    // ---- IMPORTANT: no execution here ----
    return NextResponse.json({ jobId });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "MAGUS submission failed" },
      { status: 400 }
    );
  }
}
