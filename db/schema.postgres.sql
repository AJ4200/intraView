CREATE TABLE jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE requirements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  tier        SMALLINT NOT NULL CHECK (tier BETWEEN 1 AND 3),
  weight      NUMERIC(5,2) NOT NULL DEFAULT 1 CHECK (weight > 0),
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  min_score   SMALLINT NOT NULL DEFAULT 50 CHECK (min_score BETWEEN 0 AND 100),
  position    INT NOT NULL DEFAULT 0
);

CREATE TABLE questions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  text           TEXT NOT NULL,
  ai_generated   BOOLEAN NOT NULL DEFAULT TRUE,
  position       INT NOT NULL DEFAULT 0
);

CREATE TABLE candidates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE interview_status AS ENUM ('invited', 'in_progress', 'completed', 'expired');

CREATE TABLE interviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,
  status       interview_status NOT NULL DEFAULT 'invited',
  expires_at   TIMESTAMPTZ,
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE answers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id   UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  question_id    UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  transcript     TEXT NOT NULL,
  score          SMALLINT CHECK (score BETWEEN 0 AND 100),
  rationale      TEXT,
  is_followup    BOOLEAN NOT NULL DEFAULT FALSE,
  answered_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE results (
  interview_id UUID PRIMARY KEY REFERENCES interviews(id) ON DELETE CASCADE,
  suitability  NUMERIC(5,2) NOT NULL,
  verdict      TEXT NOT NULL,
  gates_passed BOOLEAN NOT NULL,
  breakdown    JSONB NOT NULL,
  computed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_requirements_job ON requirements(job_id, tier, position);
CREATE INDEX idx_answers_interview ON answers(interview_id);

-- Accounts, ownership and timed interviews
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  password_hash TEXT,
  google_id     TEXT UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE jobs ADD COLUMN owner_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE jobs ADD COLUMN time_limit_minutes INT CHECK (time_limit_minutes BETWEEN 5 AND 240);

-- Used by the app today: the whole state as one JSON document
CREATE TABLE IF NOT EXISTS app_state (
  id   INT PRIMARY KEY,
  data JSONB NOT NULL
);
