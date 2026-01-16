import type { WorkflowStep } from "@/lib/magus/compileWorkflow";
import { buildCommand } from "@/lib/magus/buildCommand";

type RunMAGUSArgs = {
  jobDir: string;
  inputPath: string;
  steps: WorkflowStep[];
};

export async function runMAGUS({
  inputPath,
  steps,
}: RunMAGUSArgs): Promise<string> {
  await new Promise(res => setTimeout(res, 1500));

  return [
    "MAGUS stub execution",
    `Input file: ${inputPath}`,
    "",
    "Steps:",
    ...steps.map(s => buildCommand(s).join(" ")),
    "",
    "(No real execution performed)",
  ].join("\n");
}
