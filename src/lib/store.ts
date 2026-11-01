import { promises as fs } from "fs";
import path from "path";
import type { Requirement, SuitabilityResult } from "./scoring";

export interface Job {
  id: string;
  title: string;
  description?: string;
  requirements: (Requirement & { description?: string })[];
}

export interface QueueItem {
  id: string;
  requirementId: string;
  text: string;
  isFollowUp: boolean;
  answer?: string;
  score?: number;
  rationale?: string;
}

export interface Interview {
  token: string;
  jobId: string;
  candidateName: string;
  status: "invited" | "in_progress" | "completed";
  queue: QueueItem[];
  current: number;
  result?: SuitabilityResult;
  stoppedEarly?: boolean;
}

interface Db {
  jobs: Record<string, Job>;
  interviews: Record<string, Interview>;
}

// Simple JSON-file store so the app works fully offline in development.
const FILE = path.join(process.cwd(), ".data", "db.json");
let lock: Promise<unknown> = Promise.resolve();

async function read(): Promise<Db> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return { jobs: {}, interviews: {} };
  }
}

async function write(db: Db) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db, null, 2));
}

export function withDb<T>(fn: (db: Db) => Promise<T> | T): Promise<T> {
  const run = lock.then(async () => {
    const db = await read();
    const out = await fn(db);
    await write(db);
    return out;
  });
  lock = run.catch(() => undefined);
  return run;
}

export async function readDb(): Promise<Db> {
  await lock;
  return read();
}
