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

Entities: `jobs` → `requirements` (tiered, weighted) → `questions`; `candidates` → `interviews` (token/QR) → `answers` (scored per requirement) → `results`.

## Configuration

Create `.env.local`:

```
GROQ_API_KEY=your_key
GROQ_MODEL=openai/gpt-oss-20b
DATABASE_URL=postgres://user:pass@localhost:5432/intraview
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Getting started

```bash
npm install
npm run dev
```

## Roadmap

- [ ] Job & requirement builder UI
- [ ] Invite link + QR generation
- [ ] Live interview session (voice/video, captions) wired to Groq
- [ ] Recruiter dashboard with live progress and suitability results
- [ ] Offline mode with SQLite
