import { buildXTreeCommand, XTreeParams } from "@/lib/xtree/buildCommand";

export async function runXTree(
  seqPath: string,
  params: XTreeParams,
  mapPath?: string
): Promise<string> {
  const { command } = buildXTreeCommand({
    xtreePath: "xtree",
    seqPath,
    params,
    mapPath,
  });

  // Simulate runtime
  await new Promise(res => setTimeout(res, 1500));

  return [
    "XTree stub execution",
    "",
    "Command that would be executed:",
    "",
    command,
    "",
    "(xtree is not executed on this platform)",
  ].join("\n");
}
