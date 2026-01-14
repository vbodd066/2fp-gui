import fs from "fs";
import path from "path";

const LOCK_PATH = path.join(process.cwd(), "tmp", "jobs", "job.lock");

export function acquireJobLock() {
  if (fs.existsSync(LOCK_PATH)) {
    throw new Error("Another job is currently running");
  }

  fs.writeFileSync(LOCK_PATH, String(Date.now()));
}

export function releaseJobLock() {
  if (fs.existsSync(LOCK_PATH)) {
    fs.unlinkSync(LOCK_PATH);
  }
}
