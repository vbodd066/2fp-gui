export async function runMAGUS(
  inputPath: string,
  params: any
): Promise<string> {
  await new Promise(res => setTimeout(res, 2000));

  return [
    "MAGUS stub execution",
    `Input file: ${inputPath}`,
    `Parameters: ${JSON.stringify(params)}`,
    "",
    "script would be run here instead"
  ].join("\n");
}
