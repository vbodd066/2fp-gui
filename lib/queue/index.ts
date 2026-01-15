import fs from "fs/promises";
import path from "path";

const QUEUE_PATH = path.join(process.cwd(), "jobs", "queue.json");

async function readQueue(): Promise<string[]> {
  try {
    const data = await fs.readFile(QUEUE_PATH, "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeQueue(queue: string[]) {
  await fs.writeFile(QUEUE_PATH, JSON.stringify(queue, null, 2));
}

export async function enqueueJob(jobId: string) {
  const queue = await readQueue();
  queue.push(jobId);
  await writeQueue(queue);
}

export async function dequeueJob(): Promise<string | null> {
  const queue = await readQueue();
  const jobId = queue.shift() ?? null;
  await writeQueue(queue);
  return jobId;
}
