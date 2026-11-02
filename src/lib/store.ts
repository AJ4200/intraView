import { promises as fs } from "fs";
import path from "path";
import type { Requirement, SuitabilityResult } from "./scoring";

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  googleId?: string;
  createdAt: number;
}

export interface Job {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  timeLimitMinutes?: number | null;
  createdAt: number;
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
  ownerId: string;
  jobId: string;
  candidateName: string;
  status: "invited" | "in_progress" | "completed";
  queue: QueueItem[];
  current: number;
  createdAt: number;
  candidateEmail?: string;
  dueAt?: number;
  startedAt?: number;
  deadlineAt?: number;
  timedOut?: boolean;
  result?: SuitabilityResult;
  stoppedEarly?: boolean;
}

export interface Db {
  users: Record<string, User>;
  jobs: Record<string, Job>;
  interviews: Record<string, Interview>;
}

type Tx = <T>(fn: (db: Db) => Promise<T> | T, write: boolean) => Promise<T>;

const url =
  process.env.DATABASE_URL?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  process.env.POSTGRES_PRISMA_URL?.trim() ||
  process.env.DATABASE_URL_UNPOOLED?.trim() ||
  process.env.POSTGRES_URL_NON_POOLING?.trim() ||
  "";
export const storageKind: "postgres" | "sqlite" | "json" = /^postgres(ql)?:/i.test(url)
  ? "postgres"
  : /^(sqlite:|file:)/i.test(url)
  ? "sqlite"
  : "json";

const normalize = (raw: Partial<Db> | null | undefined): Db => ({
  users: raw?.users ?? {},
  jobs: raw?.jobs ?? {},
  interviews: raw?.interviews ?? {},
});

// JSON file: zero-config default for local development.
const JSON_FILE = path.join(process.cwd(), ".data", "db.json");
const jsonTx: Tx = async (fn, write) => {
  let raw: Partial<Db> | null = null;
  try {
    raw = JSON.parse(await fs.readFile(JSON_FILE, "utf8"));
  } catch {}
  const db = normalize(raw);
  const out = await fn(db);
  if (write) {
    await fs.mkdir(path.dirname(JSON_FILE), { recursive: true });
    await fs.writeFile(JSON_FILE, JSON.stringify(db, null, 2));
  }
  return out;
};

// SQLite: offline-friendly single file (Node's built-in node:sqlite).
type SqliteDb = import("node:sqlite").DatabaseSync;
let sqlite: SqliteDb | undefined;
async function sqliteHandle(): Promise<SqliteDb> {
  if (!sqlite) {
    const { DatabaseSync } = await import("node:sqlite");
    const file = url.replace(/^(sqlite:|file:)(\/\/)?/i, "") || "./.data/intraview.db";
    await fs.mkdir(path.dirname(path.resolve(file)), { recursive: true });
    sqlite = new DatabaseSync(file);
    sqlite.exec(
      "CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL)"
    );
  }
  return sqlite;
}
const sqliteTx: Tx = async (fn, write) => {
  const s = await sqliteHandle();
  const row = s.prepare("SELECT data FROM app_state WHERE id = 1").get() as { data: string } | undefined;
  const db = normalize(row ? JSON.parse(row.data) : null);
  const out = await fn(db);
  if (write) {
    s.prepare(
      "INSERT INTO app_state (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data"
    ).run(JSON.stringify(db));
  }
  return out;
};

// PostgreSQL: row-locked transaction so several server instances stay consistent.
let pool: import("pg").Pool | undefined;
let pgReady = false;
const pgTx: Tx = async (fn, write) => {
  if (!pool) {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: url });
  }
  const client = await pool.connect();
  try {
    if (!pgReady) {
      await client.query(
        "CREATE TABLE IF NOT EXISTS app_state (id INT PRIMARY KEY CHECK (id = 1), data JSONB NOT NULL)"
      );
      await client.query("INSERT INTO app_state (id, data) VALUES (1, '{}') ON CONFLICT (id) DO NOTHING");
      pgReady = true;
    }
    await client.query("BEGIN");
    const res = await client.query("SELECT data FROM app_state WHERE id = 1 FOR UPDATE");
    const db = normalize(res.rows[0]?.data);
    const out = await fn(db);
    if (write) await client.query("UPDATE app_state SET data = $1 WHERE id = 1", [JSON.stringify(db)]);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
};

const tx: Tx = storageKind === "postgres" ? pgTx : storageKind === "sqlite" ? sqliteTx : jsonTx;

let lock: Promise<unknown> = Promise.resolve();
function run<T>(fn: (db: Db) => Promise<T> | T, write: boolean): Promise<T> {
  const p = lock.then(() => tx(fn, write));
  lock = p.catch(() => undefined);
  return p;
}

export const withDb = <T>(fn: (db: Db) => Promise<T> | T) => run(fn, true);
export const readDb = (): Promise<Db> => run((db) => db, false);
