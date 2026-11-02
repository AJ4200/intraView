PRAGMA foreign_keys = ON;

CREATE TABLE jobs (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE requirements (
  id          TEXT PRIMARY KEY,
  job_id      TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  tier        INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 3),
  weight      REAL NOT NULL DEFAULT 1 CHECK (weight > 0),
  is_required INTEGER NOT NULL DEFAULT 0,
  min_score   INTEGER NOT NULL DEFAULT 50 CHECK (min_score BETWEEN 0 AND 100),
  position    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE questions (
  id             TEXT PRIMARY KEY,
  requirement_id TEXT NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  text           TEXT NOT NULL,
  ai_generated   INTEGER NOT NULL DEFAULT 1,
  position       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE candidates (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE interviews (
  id           TEXT PRIMARY KEY,
  job_id       TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,
  status       TEXT NOT NULL DEFAULT 'invited'
               CHECK (status IN ('invited','in_progress','completed','expired')),
  expires_at   TEXT,
  started_at   TEXT,
  completed_at TEXT
);

CREATE TABLE answers (
  id             TEXT PRIMARY KEY,
  interview_id   TEXT NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  question_id    TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  requirement_id TEXT NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  transcript     TEXT NOT NULL,
  score          INTEGER CHECK (score BETWEEN 0 AND 100),
  rationale      TEXT,
  is_followup    INTEGER NOT NULL DEFAULT 0,
  answered_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE results (
  interview_id TEXT PRIMARY KEY REFERENCES interviews(id) ON DELETE CASCADE,
  suitability  REAL NOT NULL,
  verdict      TEXT NOT NULL,
  gates_passed INTEGER NOT NULL,
  breakdown    TEXT NOT NULL,
  computed_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_requirements_job ON requirements(job_id, tier, position);
CREATE INDEX idx_answers_interview ON answers(interview_id);

-- Accounts, ownership and timed interviews
CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  password_hash TEXT,
  google_id     TEXT UNIQUE,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
ALTER TABLE jobs ADD COLUMN owner_id TEXT REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE jobs ADD COLUMN time_limit_minutes INTEGER CHECK (time_limit_minutes BETWEEN 5 AND 240);

-- Used by the app today: the whole state as one JSON document
CREATE TABLE IF NOT EXISTS app_state (
  id   INTEGER PRIMARY KEY,
  data TEXT NOT NULL
);
