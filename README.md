# IntraView

IntraView is a live, AI-assisted interview platform for **pre-screened candidates**. Candidates have already been shortlisted for a specific job role. IntraView runs a **tiered interview** against *every requirement* of that role and produces a **suitability percentage**.

## How it works

1. **Recruiter creates a Job** with a list of weighted requirements (skills, experience, soft skills, etc.) grouped into tiers.
2. **Recruiter invites candidates.** Each candidate gets a unique link and QR code (`/i/<token>`).
3. **Candidate opens the link/QR** and the live interview starts automatically. No account is needed.
4. **Tiered questioning.** Questions are asked in order, tier by tier:
   - **Tier 1 – Screening:** must-have requirements. Failing a required gate can end the interview early.
   - **Tier 2 – Core:** main technical/role competencies.
   - **Tier 3 – Deep dive:** advanced, culture and soft-skill questions.
5. **Groq AI** generates questions per requirement, asks follow-ups, and scores each answer 0–100 with a rationale.
6. **Suitability %** is computed from all requirements (weighted) and shown to the recruiter with a per-requirement breakdown.

## Suitability scoring

```
suitability = Σ(requirement_score × weight) / Σ(weight)
```

- Every requirement must be covered; unanswered requirements score 0.
- Requirements flagged `is_required` are gates: a score below `min_score` marks the candidate **not suitable** regardless of the total.
- Verdicts: `>= 80` Strong match, `60–79` Potential match, `< 60` Not suitable.

See [src/lib/scoring.ts](src/lib/scoring.ts) and [src/lib/groq.ts](src/lib/groq.ts).

## Tech stack

| Concern  | Choice                                                         |
| -------- | -------------------------------------------------------------- |
| App      | Next.js (App Router), React, TypeScript                        |
| AI       | [Groq](https://console.groq.com) (free API keys)               |
| Database | PostgreSQL (hosted) or SQLite (offline/local)                  |
| Live     | Server-Sent Events / WebSocket for the live recruiter view     |

## Database

- PostgreSQL: [db/schema.postgres.sql](db/schema.postgres.sql)
- SQLite (offline): [db/schema.sqlite.sql](db/schema.sqlite.sql)

Entities: `iv_users` → `iv_jobs` → `iv_requirements`; `iv_candidates` → `iv_interviews` → `iv_questions` (including answers and scores) → `iv_results`. The SQLite and PostgreSQL schemas use the same tables and columns.

## Configuration

Copy `.env.example` to `.env.local`:

| Variable | Purpose |
| -------- | ------- |
| `GROQ_API_KEY`, `GROQ_MODEL` | AI question generation and scoring |
| `SESSION_SECRET` | Required; signs recruiter session cookies |
| `NEXT_PUBLIC_APP_URL` | Base URL for invite links, QR codes and Google redirect |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional Google sign-in (redirect URI `<APP_URL>/api/auth/google/callback`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Optional SMTP. When set (`SMTP_HOST` and `SMTP_FROM` at minimum), an invite created with a candidate email is sent automatically; port 465 uses implicit TLS, others STARTTLS. Without it the dashboard offers a `mailto:` link and copy-HTML instead |
| `DATABASE_URL` | Optional. `postgres://...` for PostgreSQL (including Neon), `file:./.data/intraview.db` for SQLite (needs Node 22.5+), unset for `.data/db.json`. Neon/Vercel `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `DATABASE_URL_UNPOOLED` and `POSTGRES_URL_NON_POOLING` are accepted if `DATABASE_URL` is unset; pooled URLs are preferred over unpooled fallbacks. |

SQLite and PostgreSQL store users, jobs, requirements, candidates, interviews, questions/answers, and results in relational tables. On first startup, existing `app_state` data is imported into these tables and the old table is removed. Unset `DATABASE_URL` continues to use the local JSON file for zero-configuration development.

## Accounts

Recruiters register with email and password or sign in with Google. Jobs and interviews are scoped to the signed-in recruiter (httpOnly session cookie).

## Timed interviews

Each job can use the recommended time (based on question count), a custom time (5-240 min) or no limit. The clock starts when the candidate presses Begin; at zero the draft answer is submitted and the interview ends.

## API

Recruiter routes use the session cookie.

| Method | Route | Purpose |
| ------ | ----- | ------- |
| POST | `/api/auth/register`, `/api/auth/login`, `/api/auth/logout` | Email accounts |
| GET | `/api/auth/me`, `/api/auth/google` | Current user, Google sign-in |
| GET/POST | `/api/jobs` | List / create jobs with `requirements[]` and time limit |
| DELETE | `/api/jobs/:id` | Delete a job |
| POST | `/api/jobs/:id/invite` | Create an interview for `{ candidateName, candidateEmail?, dueAt? }`; returns `link`, `qr` (via [commonfunlib](https://www.npmjs.com/package/commonfunlib)) and, when an email is given, a styled `email` (`mailto`, `html`, `text`). Starting after `dueAt` is rejected (410) |
| GET | `/api/interview/:token` | Candidate view (read-only) |
| POST | `/api/interview/:token/start` | Begin: generates questions, starts the timer |
| POST | `/api/interview/:token/answer` | Submit `{ answer }`; scored by Groq |
| POST | `/api/interview/:token/expire` | Close an interview when time runs out |
| GET | `/api/interview/:token/live` | Recruiter live stream (SSE, owner only) |

Candidates use `/i/<token>`. The dock footer offers search (Ctrl+K), home and a menu; the legal bar (made by AJ4200, EULA, clear cache) appears on hover.
## Getting started

```bash
npm install
npm run dev
```

## Using the app

1. Set `.env.local` (see `.env.example`) and run `npm run dev`.
2. Open `/dashboard`, register or sign in, and create a job with its requirements (tier, weight, must-pass, minimum score).
3. Click **Create invite** for a candidate (optionally with their email and a complete-by date) to get a link and QR code. With SMTP configured the styled email is sent automatically; otherwise **Email candidate** opens your mail client pre-filled and **Copy HTML** gives the styled template. Then **Watch live**.
4. The candidate opens `/i/<token>`: questions are read aloud, answers can be typed or dictated, and each answer is scored by Groq.
5. The live view shows the transcript, per-answer scores and the final suitability %.

## Roadmap

- [x] Job & requirement builder UI
- [x] Invite link + QR generation
- [x] Live interview session (read-aloud questions, dictation, captions) wired to Groq
- [x] Recruiter dashboard with live progress and suitability results
- [x] PostgreSQL/SQLite/JSON storage via `DATABASE_URL`
- [ ] Video recording
