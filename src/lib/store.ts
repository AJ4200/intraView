import { randomUUID } from "crypto";
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
  id: string;
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

const emptyDb = (): Db => ({ users: {}, jobs: {}, interviews: {} });

const normalize = (raw: Partial<Db> | null | undefined): Db => {
  const db = emptyDb();
  for (const [id, user] of Object.entries(raw?.users ?? {})) {
    db.users[id] = user;
  }
  for (const [id, job] of Object.entries(raw?.jobs ?? {})) {
    db.jobs[id] = { ...job, requirements: job.requirements ?? [] };
  }
  for (const [token, interview] of Object.entries(raw?.interviews ?? {})) {
    db.interviews[token] = {
      ...interview,
      id: interview.id ?? randomUUID(),
      queue: interview.queue ?? [],
    };
  }
  return db;
};

const mergeDb = (current: Db, legacy: Db): Db => ({
  users: { ...legacy.users, ...current.users },
  jobs: { ...legacy.jobs, ...current.jobs },
  interviews: { ...legacy.interviews, ...current.interviews },
});

const SQLITE_SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS iv_users (
  id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  password_hash TEXT, google_id TEXT UNIQUE, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS iv_jobs (
  id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES iv_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, description TEXT, time_limit_minutes INTEGER, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS iv_requirements (
  id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES iv_jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT, tier INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 3),
  weight REAL NOT NULL CHECK (weight > 0), is_required INTEGER NOT NULL,
  min_score INTEGER NOT NULL CHECK (min_score BETWEEN 0 AND 100), position INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS iv_candidates (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS iv_interviews (
  id TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE,
  candidate_id TEXT NOT NULL UNIQUE REFERENCES iv_candidates(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES iv_users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES iv_jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('invited', 'in_progress', 'completed')),
  current_index INTEGER NOT NULL, created_at INTEGER NOT NULL,
  due_at INTEGER, started_at INTEGER, deadline_at INTEGER,
  timed_out INTEGER NOT NULL, stopped_early INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS iv_questions (
  id TEXT PRIMARY KEY, interview_id TEXT NOT NULL REFERENCES iv_interviews(id) ON DELETE CASCADE,
  requirement_id TEXT NOT NULL REFERENCES iv_requirements(id) ON DELETE CASCADE,
  text TEXT NOT NULL, is_follow_up INTEGER NOT NULL, position INTEGER NOT NULL,
  answer TEXT, score REAL CHECK (score BETWEEN 0 AND 100), rationale TEXT
);
CREATE TABLE IF NOT EXISTS iv_results (
  interview_id TEXT PRIMARY KEY REFERENCES iv_interviews(id) ON DELETE CASCADE,
  suitability REAL NOT NULL CHECK (suitability BETWEEN 0 AND 100),
  verdict TEXT NOT NULL, gates_passed INTEGER NOT NULL,
  breakdown TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS iv_requirements_job ON iv_requirements(job_id, tier, position);
CREATE INDEX IF NOT EXISTS iv_questions_interview ON iv_questions(interview_id, position);
`;

const POSTGRES_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS iv_users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    password_hash TEXT, google_id TEXT UNIQUE, created_at BIGINT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS iv_jobs (
    id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES iv_users(id) ON DELETE CASCADE,
    title TEXT NOT NULL, description TEXT, time_limit_minutes INTEGER, created_at BIGINT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS iv_requirements (
    id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES iv_jobs(id) ON DELETE CASCADE,
    name TEXT NOT NULL, description TEXT, tier SMALLINT NOT NULL, weight DOUBLE PRECISION NOT NULL,
    is_required BOOLEAN NOT NULL,
    min_score SMALLINT NOT NULL CHECK (min_score BETWEEN 0 AND 100), position INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS iv_candidates (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, created_at BIGINT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS iv_interviews (
    id TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE,
    candidate_id TEXT NOT NULL UNIQUE REFERENCES iv_candidates(id) ON DELETE CASCADE,
    owner_id TEXT NOT NULL REFERENCES iv_users(id) ON DELETE CASCADE,
    job_id TEXT NOT NULL REFERENCES iv_jobs(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('invited', 'in_progress', 'completed')),
    current_index INTEGER NOT NULL, created_at BIGINT NOT NULL,
    due_at BIGINT, started_at BIGINT, deadline_at BIGINT,
    timed_out BOOLEAN NOT NULL, stopped_early BOOLEAN NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS iv_questions (
    id TEXT PRIMARY KEY, interview_id TEXT NOT NULL REFERENCES iv_interviews(id) ON DELETE CASCADE,
    requirement_id TEXT NOT NULL REFERENCES iv_requirements(id) ON DELETE CASCADE,
    text TEXT NOT NULL, is_follow_up BOOLEAN NOT NULL, position INTEGER NOT NULL,
    answer TEXT, score DOUBLE PRECISION CHECK (score BETWEEN 0 AND 100), rationale TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS iv_results (
    interview_id TEXT PRIMARY KEY REFERENCES iv_interviews(id) ON DELETE CASCADE,
    suitability DOUBLE PRECISION NOT NULL CHECK (suitability BETWEEN 0 AND 100),
    verdict TEXT NOT NULL, gates_passed BOOLEAN NOT NULL,
    breakdown JSONB NOT NULL
  )`,
  "CREATE INDEX IF NOT EXISTS iv_requirements_job ON iv_requirements(job_id, tier, position)",
  "CREATE INDEX IF NOT EXISTS iv_questions_interview ON iv_questions(interview_id, position)",
];

type SqliteDb = import("node:sqlite").DatabaseSync;
type SqliteRow = Record<string, unknown>;

function sqliteRead(s: SqliteDb): Db {
  const db = emptyDb();
  for (const row of s.prepare("SELECT * FROM iv_users").all() as SqliteRow[]) {
    db.users[String(row.id)] = {
      id: String(row.id),
      email: String(row.email),
      name: String(row.name),
      passwordHash: row.password_hash === null ? undefined : String(row.password_hash),
      googleId: row.google_id === null ? undefined : String(row.google_id),
      createdAt: Number(row.created_at),
    };
  }
  const jobs = new Map<string, Job>();
  for (const row of s.prepare("SELECT * FROM iv_jobs").all() as SqliteRow[]) {
    const job: Job = {
      id: String(row.id),
      ownerId: String(row.owner_id),
      title: String(row.title),
      description: row.description === null ? undefined : String(row.description),
      timeLimitMinutes: row.time_limit_minutes === null ? null : Number(row.time_limit_minutes),
      createdAt: Number(row.created_at),
      requirements: [],
    };
    jobs.set(job.id, job);
    db.jobs[job.id] = job;
  }
  for (const row of s.prepare("SELECT * FROM iv_requirements ORDER BY position").all() as SqliteRow[]) {
    const job = jobs.get(String(row.job_id));
    if (!job) continue;
    job.requirements.push({
      id: String(row.id),
      name: String(row.name),
      description: row.description === null ? undefined : String(row.description),
      tier: Number(row.tier) as 1 | 2 | 3,
      weight: Number(row.weight),
      isRequired: Boolean(row.is_required),
      minScore: Number(row.min_score),
    });
  }
  const candidates = new Map<string, { name: string; email?: string }>();
  for (const row of s.prepare("SELECT * FROM iv_candidates").all() as SqliteRow[]) {
    candidates.set(String(row.id), {
      name: String(row.name),
      email: row.email === null ? undefined : String(row.email),
    });
  }
  const interviews = new Map<string, Interview>();
  for (const row of s.prepare("SELECT * FROM iv_interviews").all() as SqliteRow[]) {
    const candidate = candidates.get(String(row.candidate_id));
    if (!candidate) continue;
    const interview: Interview = {
      id: String(row.id),
      token: String(row.token),
      ownerId: String(row.owner_id),
      jobId: String(row.job_id),
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      status: String(row.status) as Interview["status"],
      queue: [],
      current: Number(row.current_index),
      createdAt: Number(row.created_at),
      dueAt: row.due_at === null ? undefined : Number(row.due_at),
      startedAt: row.started_at === null ? undefined : Number(row.started_at),
      deadlineAt: row.deadline_at === null ? undefined : Number(row.deadline_at),
      timedOut: Boolean(row.timed_out),
      stoppedEarly: Boolean(row.stopped_early),
    };
    interviews.set(interview.id, interview);
    db.interviews[interview.token] = interview;
  }
  for (const row of s.prepare("SELECT * FROM iv_questions ORDER BY position").all() as SqliteRow[]) {
    const interview = interviews.get(String(row.interview_id));
    if (!interview) continue;
    interview.queue.push({
      id: String(row.id),
      requirementId: String(row.requirement_id),
      text: String(row.text),
      isFollowUp: Boolean(row.is_follow_up),
      answer: row.answer === null ? undefined : String(row.answer),
      score: row.score === null ? undefined : Number(row.score),
      rationale: row.rationale === null ? undefined : String(row.rationale),
    });
  }
  for (const row of s.prepare("SELECT * FROM iv_results").all() as SqliteRow[]) {
    const interview = interviews.get(String(row.interview_id));
    if (!interview) continue;
    interview.result = {
      suitability: Number(row.suitability),
      verdict: String(row.verdict) as SuitabilityResult["verdict"],
      gatesPassed: Boolean(row.gates_passed),
      breakdown: JSON.parse(String(row.breakdown)) as SuitabilityResult["breakdown"],
    };
  }
  return db;
}

function sqliteWrite(s: SqliteDb, db: Db) {
  s.exec("DELETE FROM iv_results; DELETE FROM iv_questions; DELETE FROM iv_interviews; DELETE FROM iv_candidates; DELETE FROM iv_requirements; DELETE FROM iv_jobs; DELETE FROM iv_users;");
  const user = s.prepare(
    "INSERT INTO iv_users (id, email, name, password_hash, google_id, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const u of Object.values(db.users)) {
    user.run(u.id, u.email, u.name, u.passwordHash ?? null, u.googleId ?? null, u.createdAt);
  }
  const job = s.prepare(
    "INSERT INTO iv_jobs (id, owner_id, title, description, time_limit_minutes, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const requirement = s.prepare(
    "INSERT INTO iv_requirements (id, job_id, name, description, tier, weight, is_required, min_score, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  for (const j of Object.values(db.jobs)) {
    job.run(j.id, j.ownerId, j.title, j.description ?? null, j.timeLimitMinutes ?? null, j.createdAt);
    j.requirements.forEach((r, position) => {
      requirement.run(r.id, j.id, r.name, r.description ?? null, r.tier, r.weight, Number(r.isRequired), r.minScore, position);
    });
  }
  const candidate = s.prepare("INSERT INTO iv_candidates (id, name, email, created_at) VALUES (?, ?, ?, ?)");
  const interview = s.prepare(
    "INSERT INTO iv_interviews (id, token, candidate_id, owner_id, job_id, status, current_index, created_at, due_at, started_at, deadline_at, timed_out, stopped_early) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const question = s.prepare(
    "INSERT INTO iv_questions (id, interview_id, requirement_id, text, is_follow_up, position, answer, score, rationale) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const result = s.prepare(
    "INSERT INTO iv_results (interview_id, suitability, verdict, gates_passed, breakdown) VALUES (?, ?, ?, ?, ?)"
  );
  for (const i of Object.values(db.interviews)) {
    candidate.run(i.id, i.candidateName, i.candidateEmail ?? null, i.createdAt);
    interview.run(
      i.id, i.token, i.id, i.ownerId, i.jobId, i.status, i.current, i.createdAt,
      i.dueAt ?? null, i.startedAt ?? null, i.deadlineAt ?? null, Number(i.timedOut ?? false), Number(i.stoppedEarly ?? false)
    );
    i.queue.forEach((q, position) => {
      question.run(q.id, i.id, q.requirementId, q.text, Number(q.isFollowUp), position, q.answer ?? null, q.score ?? null, q.rationale ?? null);
    });
    if (i.result) {
      result.run(i.id, i.result.suitability, i.result.verdict, Number(i.result.gatesPassed), JSON.stringify(i.result.breakdown));
    }
  }
}

function readLegacy(raw: unknown): Db | null {
  if (raw === null || raw === undefined) return null;
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return normalize(parsed as Partial<Db>);
}

// SQLite: offline-friendly single file (Node's built-in node:sqlite).
let sqlite: SqliteDb | undefined;
async function sqliteHandle(): Promise<SqliteDb> {
  if (!sqlite) {
    const { DatabaseSync } = await import("node:sqlite");
    const file = url.replace(/^(sqlite:|file:)(\/\/)?/i, "") || "./.data/intraview.db";
    await fs.mkdir(path.dirname(path.resolve(file)), { recursive: true });
    const connection = new DatabaseSync(file);
    connection.exec(SQLITE_SCHEMA);
    connection.exec("BEGIN IMMEDIATE");
    try {
      const legacyTable = connection.prepare(
        "SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = 'app_state'"
      ).get() as SqliteRow | undefined;
      if (legacyTable) {
        const legacyRow = connection.prepare("SELECT data FROM app_state WHERE id = 1").get() as { data: string } | undefined;
        const legacy = readLegacy(legacyRow?.data);
        if (legacy) sqliteWrite(connection, mergeDb(sqliteRead(connection), legacy));
        connection.exec("DROP TABLE app_state");
      }
      connection.exec("COMMIT");
    } catch (e) {
      connection.exec("ROLLBACK");
      throw e;
    }
    sqlite = connection;
  }
  return sqlite;
}

const sqliteTx: Tx = async (fn, write) => {
  const s = await sqliteHandle();
  s.exec("BEGIN IMMEDIATE");
  try {
    const db = sqliteRead(s);
    const out = await fn(db);
    if (write) sqliteWrite(s, db);
    s.exec("COMMIT");
    return out;
  } catch (e) {
    s.exec("ROLLBACK");
    throw e;
  }
};

// PostgreSQL: advisory transaction lock keeps multi-instance updates consistent.
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
      for (const statement of POSTGRES_SCHEMA) await client.query(statement);
    }
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(684321907)");
    if (!pgReady) {
      const legacyTable = await client.query<{ found: string | null }>("SELECT to_regclass('app_state') AS found");
      if (legacyTable.rows[0]?.found) {
        const legacyResult = await client.query<{ data: unknown }>("SELECT data FROM app_state WHERE id = 1");
        const legacy = readLegacy(legacyResult.rows[0]?.data);
        if (legacy) {
          const current = await postgresRead(client);
          await postgresWrite(client, mergeDb(current, legacy));
        }
        await client.query("DROP TABLE app_state");
      }
    }
    const db = await postgresRead(client);
    const out = await fn(db);
    if (write) await postgresWrite(client, db);
    await client.query("COMMIT");
    pgReady = true;
    return out;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
};

type PgClient = import("pg").PoolClient;
type PgRow = Record<string, unknown>;
const num = (value: unknown) => Number(value);
const optional = (value: unknown) => value === null || value === undefined ? undefined : String(value);

async function postgresRead(client: PgClient): Promise<Db> {
  const db = emptyDb();
  const users = await client.query("SELECT * FROM iv_users");
  for (const row of users.rows as PgRow[]) {
    db.users[String(row.id)] = {
      id: String(row.id), email: String(row.email), name: String(row.name),
      passwordHash: optional(row.password_hash), googleId: optional(row.google_id), createdAt: num(row.created_at),
    };
  }
  const jobs = new Map<string, Job>();
  for (const row of (await client.query("SELECT * FROM iv_jobs")).rows as PgRow[]) {
    const job: Job = {
      id: String(row.id), ownerId: String(row.owner_id), title: String(row.title),
      description: optional(row.description), timeLimitMinutes: row.time_limit_minutes === null ? null : num(row.time_limit_minutes),
      createdAt: num(row.created_at), requirements: [],
    };
    jobs.set(job.id, job);
    db.jobs[job.id] = job;
  }
  for (const row of (await client.query("SELECT * FROM iv_requirements ORDER BY position")).rows as PgRow[]) {
    const job = jobs.get(String(row.job_id));
    if (!job) continue;
    job.requirements.push({
      id: String(row.id), name: String(row.name), description: optional(row.description),
      tier: num(row.tier) as 1 | 2 | 3, weight: num(row.weight),
      isRequired: Boolean(row.is_required), minScore: num(row.min_score),
    });
  }
  const candidates = new Map<string, { name: string; email?: string }>();
  for (const row of (await client.query("SELECT * FROM iv_candidates")).rows as PgRow[]) {
    candidates.set(String(row.id), { name: String(row.name), email: optional(row.email) });
  }
  const interviews = new Map<string, Interview>();
  for (const row of (await client.query("SELECT * FROM iv_interviews")).rows as PgRow[]) {
    const candidate = candidates.get(String(row.candidate_id));
    if (!candidate) continue;
    const i: Interview = {
      id: String(row.id), token: String(row.token), ownerId: String(row.owner_id), jobId: String(row.job_id),
      candidateName: candidate.name, candidateEmail: candidate.email,
      status: String(row.status) as Interview["status"], queue: [], current: num(row.current_index),
      createdAt: num(row.created_at), dueAt: row.due_at === null ? undefined : num(row.due_at),
      startedAt: row.started_at === null ? undefined : num(row.started_at),
      deadlineAt: row.deadline_at === null ? undefined : num(row.deadline_at),
      timedOut: Boolean(row.timed_out), stoppedEarly: Boolean(row.stopped_early),
    };
    interviews.set(i.id, i);
    db.interviews[i.token] = i;
  }
  for (const row of (await client.query("SELECT * FROM iv_questions ORDER BY position")).rows as PgRow[]) {
    const i = interviews.get(String(row.interview_id));
    if (!i) continue;
    i.queue.push({
      id: String(row.id), requirementId: String(row.requirement_id), text: String(row.text),
      isFollowUp: Boolean(row.is_follow_up), answer: optional(row.answer),
      score: row.score === null ? undefined : num(row.score), rationale: optional(row.rationale),
    });
  }
  for (const row of (await client.query("SELECT * FROM iv_results")).rows as PgRow[]) {
    const i = interviews.get(String(row.interview_id));
    if (!i) continue;
    i.result = {
      suitability: num(row.suitability), verdict: String(row.verdict) as SuitabilityResult["verdict"],
      gatesPassed: Boolean(row.gates_passed),
      breakdown: (typeof row.breakdown === "string" ? JSON.parse(row.breakdown) : row.breakdown) as SuitabilityResult["breakdown"],
    };
  }
  return db;
}

async function postgresWrite(client: PgClient, db: Db) {
  await client.query("DELETE FROM iv_results");
  await client.query("DELETE FROM iv_questions");
  await client.query("DELETE FROM iv_interviews");
  await client.query("DELETE FROM iv_candidates");
  await client.query("DELETE FROM iv_requirements");
  await client.query("DELETE FROM iv_jobs");
  await client.query("DELETE FROM iv_users");
  for (const u of Object.values(db.users)) {
    await client.query(
      "INSERT INTO iv_users (id, email, name, password_hash, google_id, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
      [u.id, u.email, u.name, u.passwordHash ?? null, u.googleId ?? null, u.createdAt]
    );
  }
  for (const j of Object.values(db.jobs)) {
    await client.query(
      "INSERT INTO iv_jobs (id, owner_id, title, description, time_limit_minutes, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
      [j.id, j.ownerId, j.title, j.description ?? null, j.timeLimitMinutes ?? null, j.createdAt]
    );
    for (const [position, r] of j.requirements.entries()) {
      await client.query(
        "INSERT INTO iv_requirements (id, job_id, name, description, tier, weight, is_required, min_score, position) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [r.id, j.id, r.name, r.description ?? null, r.tier, r.weight, r.isRequired, r.minScore, position]
      );
    }
  }
  for (const i of Object.values(db.interviews)) {
    await client.query("INSERT INTO iv_candidates (id, name, email, created_at) VALUES ($1, $2, $3, $4)", [
      i.id, i.candidateName, i.candidateEmail ?? null, i.createdAt,
    ]);
    await client.query(
      "INSERT INTO iv_interviews (id, token, candidate_id, owner_id, job_id, status, current_index, created_at, due_at, started_at, deadline_at, timed_out, stopped_early) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)",
      [i.id, i.token, i.id, i.ownerId, i.jobId, i.status, i.current, i.createdAt, i.dueAt ?? null, i.startedAt ?? null, i.deadlineAt ?? null, Boolean(i.timedOut), Boolean(i.stoppedEarly)]
    );
    for (const [position, q] of i.queue.entries()) {
      await client.query(
        "INSERT INTO iv_questions (id, interview_id, requirement_id, text, is_follow_up, position, answer, score, rationale) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [q.id, i.id, q.requirementId, q.text, q.isFollowUp, position, q.answer ?? null, q.score ?? null, q.rationale ?? null]
      );
    }
    if (i.result) {
      await client.query(
        "INSERT INTO iv_results (interview_id, suitability, verdict, gates_passed, breakdown) VALUES ($1, $2, $3, $4, $5)",
        [i.id, i.result.suitability, i.result.verdict, i.result.gatesPassed, JSON.stringify(i.result.breakdown)]
      );
    }
  }
}

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

const tx: Tx = storageKind === "postgres" ? pgTx : storageKind === "sqlite" ? sqliteTx : jsonTx;

let lock: Promise<unknown> = Promise.resolve();
function run<T>(fn: (db: Db) => Promise<T> | T, write: boolean): Promise<T> {
  const p = lock.then(() => tx(fn, write));
  lock = p.catch(() => undefined);
  return p;
}

export const withDb = <T>(fn: (db: Db) => Promise<T> | T) => run(fn, true);
export const readDb = (): Promise<Db> => run((db) => db, false);
