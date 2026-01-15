export async function runXTree(
  inputPath: string,
  params: any
): Promise<string> {
  // Simulate runtime
  await new Promise(res => setTimeout(res, 1500));

  return [
    "XTree stub execution",
    `Input file: ${inputPath}`,
    `Parameters: ${JSON.stringify(params)}`,
    "",
    "script would be run here instead"
  ].join("\n");
}
