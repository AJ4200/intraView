import { randomUUID, randomBytes } from "crypto";
import { generateQuestions, scoreAnswer } from "./groq";
import { computeSuitability, shouldStopEarly } from "./scoring";
import { readDb, withDb, type Interview, type Job, type QueueItem } from "./store";

const MAX_ANSWER_LENGTH = 4000;

export function createInterview(job: Job, candidateName: string): Promise<Interview> {
  const interview: Interview = {
    token: randomBytes(16).toString("hex"),
    jobId: job.id,
    candidateName,
    status: "invited",
    queue: [],
    current: 0,
  };
  return withDb((db) => {
    db.interviews[interview.token] = interview;
    return interview;
  });
}

const orderedRequirements = (job: Job) =>
  [...job.requirements].sort((a, b) => a.tier - b.tier);

// Generates every question up front, ordered tier by tier, covering all requirements.
export async function startInterview(token: string): Promise<Interview | null> {
  const db = await readDb();
  const interview = db.interviews[token];
  if (!interview) return null;
  if (interview.status !== "invited") return interview;
  const job = db.jobs[interview.jobId];
  if (!job) return null;

  const groups = await Promise.all(
    orderedRequirements(job).map(async (r) => {
      let texts: string[];
      try {
        texts = await generateQuestions(job.title, `${r.name}${r.description ? `: ${r.description}` : ""}`);
      } catch {
        texts = [`Tell us about your experience with ${r.name}.`];
      }
      return texts.slice(0, 3).map<QueueItem>((text) => ({
        id: randomUUID(),
        requirementId: r.id,
        text,
        isFollowUp: false,
      }));
    })
  );

  return withDb((d) => {
    const i = d.interviews[token];
    if (i.status === "invited") {
      i.queue = groups.flat();
      i.status = "in_progress";
    }
    return i;
  });
}

export async function submitAnswer(token: string, answer: string): Promise<Interview | null> {
  const text = answer.trim().slice(0, MAX_ANSWER_LENGTH);
  const db = await readDb();
  const interview = db.interviews[token];
  if (!interview || interview.status !== "in_progress" || !text) return interview ?? null;
  const job = db.jobs[interview.jobId];
  const item = interview.queue[interview.current];
  const req = job.requirements.find((r) => r.id === item.requirementId)!;

  let graded: { score: number; rationale: string; followUp: string | null };
  try {
    graded = await scoreAnswer(req.name, item.text, text);
  } catch {
    graded = { score: 0, rationale: "Scoring unavailable", followUp: null };
  }
  const score = Math.min(100, Math.max(0, Number(graded.score) || 0));

  return withDb((d) => {
    const i = d.interviews[token];
    const cur = i.queue[i.current];
    if (cur.answer !== undefined) return i; // already answered
    cur.answer = text;
    cur.score = score;
    cur.rationale = graded.rationale;

    if (graded.followUp && !cur.isFollowUp) {
      i.queue.splice(i.current + 1, 0, {
        id: randomUUID(),
        requirementId: cur.requirementId,
        text: graded.followUp,
        isFollowUp: true,
      });
    }

    const j = d.jobs[i.jobId];
    const scores = requirementScores(i);
    if (shouldStopEarly(j.requirements, scores)) i.stoppedEarly = true;

    i.current += 1;
    if (i.stoppedEarly || i.current >= i.queue.length) {
      i.status = "completed";
      i.result = computeSuitability(j.requirements, requirementScores(i));
    }
    return i;
  });
}

function requirementScores(i: Interview) {
  const acc = new Map<string, number[]>();
  for (const q of i.queue) {
    if (q.score === undefined) continue;
    acc.set(q.requirementId, [...(acc.get(q.requirementId) ?? []), q.score]);
  }
  return [...acc].map(([requirementId, s]) => ({
    requirementId,
    score: s.reduce((a, b) => a + b, 0) / s.length,
  }));
}

// Candidate-safe view: never exposes scores or rationale.
export function candidateView(i: Interview, job: Job) {
  const q = i.status === "in_progress" ? i.queue[i.current] : undefined;
  return {
    candidateName: i.candidateName,
    jobTitle: job.title,
    status: i.status,
    total: i.queue.length,
    index: i.current,
    question: q
      ? {
          text: q.text,
          requirement: job.requirements.find((r) => r.id === q.requirementId)?.name,
          tier: job.requirements.find((r) => r.id === q.requirementId)?.tier,
        }
      : null,
  };
}

// Recruiter view includes full scoring details.
export function recruiterView(i: Interview, job: Job) {
  return { ...candidateView(i, job), queue: i.queue, result: i.result, stoppedEarly: i.stoppedEarly };
}
