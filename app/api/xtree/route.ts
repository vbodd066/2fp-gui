import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

import { validateSequenceFile } from "@/lib/uploads/validate";
import { MAX_XTREE_FILE_SIZE } from "@/lib/uploads/limits";
import { runXTree } from "@/lib/execution/runXtree";
import { acquireJobLock, releaseJobLock } from "@/lib/execution/jobLock";

export async function POST(req: NextRequest) {
  try {
    acquireJobLock();

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const paramsRaw = formData.get("params");

    if (!file) throw new Error("No file uploaded");
    if (file.size > MAX_XTREE_FILE_SIZE) throw new Error("File too large");

    const buffer = Buffer.from(await file.arrayBuffer());
    validateSequenceFile(buffer, file.name);

    const params = { db: "gtdb", readType: "short", sensitivity: "standard" };
    if (paramsRaw) {
      const p = JSON.parse(String(paramsRaw));
      if (["gtdb", "refseq"].includes(p.db)) params.db = p.db;
      if (["short", "long"].includes(p.readType)) params.readType = p.readType;
      if (["standard", "high"].includes(p.sensitivity)) params.sensitivity = p.sensitivity;
    }

    const tmpPath = path.join(process.cwd(), "tmp/uploads", `xtree-${Date.now()}-${file.name}`);
    await writeFile(tmpPath, buffer);

    const result = await runXTree(tmpPath, params);
    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    releaseJobLock();
  }
}
