CREATE TABLE IF NOT EXISTS iv_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT,
  google_id TEXT UNIQUE,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS iv_jobs (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES iv_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  time_limit_minutes INTEGER,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS iv_requirements (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES iv_jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  tier SMALLINT NOT NULL CHECK (tier BETWEEN 1 AND 3),
  weight DOUBLE PRECISION NOT NULL CHECK (weight > 0),
  is_required BOOLEAN NOT NULL,
  min_score SMALLINT NOT NULL CHECK (min_score BETWEEN 0 AND 100),
  position INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS iv_candidates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS iv_interviews (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  candidate_id TEXT NOT NULL UNIQUE REFERENCES iv_candidates(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL REFERENCES iv_users(id) ON DELETE CASCADE,
  job_id TEXT NOT NULL REFERENCES iv_jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('invited', 'in_progress', 'completed')),
  current_index INTEGER NOT NULL,
  created_at BIGINT NOT NULL,
  due_at BIGINT,
  started_at BIGINT,
  deadline_at BIGINT,
  timed_out BOOLEAN NOT NULL,
  stopped_early BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS iv_questions (
  id TEXT PRIMARY KEY,
  interview_id TEXT NOT NULL REFERENCES iv_interviews(id) ON DELETE CASCADE,
  requirement_id TEXT NOT NULL REFERENCES iv_requirements(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_follow_up BOOLEAN NOT NULL,
  position INTEGER NOT NULL,
  answer TEXT,
  score DOUBLE PRECISION CHECK (score BETWEEN 0 AND 100),
  rationale TEXT
);

CREATE TABLE IF NOT EXISTS iv_results (
  interview_id TEXT PRIMARY KEY REFERENCES iv_interviews(id) ON DELETE CASCADE,
  suitability DOUBLE PRECISION NOT NULL CHECK (suitability BETWEEN 0 AND 100),
  verdict TEXT NOT NULL,
  gates_passed BOOLEAN NOT NULL,
  breakdown JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS iv_requirements_job ON iv_requirements(job_id, tier, position);
CREATE INDEX IF NOT EXISTS iv_questions_interview ON iv_questions(interview_id, position);
