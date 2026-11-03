import { randomBytes, randomUUID } from "crypto";
import { generateQuestions, scoreAnswer } from "./groq";
import { computeSuitability, shouldStopEarly } from "./scoring";
import { readDb, withDb, type Interview, type Job, type QueueItem } from "./store";

const MAX_ANSWER_LENGTH = 4000;
// Answers that begin shortly after the deadline are still accepted (scoring takes a few seconds).
const ANSWER_GRACE_MS = 15_000;
// Interviews abandoned past their deadline are closed by the server after this long.
export const ABANDON_MS = 60_000;

export function createInterview(
  job: Job,
  candidateName: string,
  extra: { candidateEmail?: string; dueAt?: number } = {}
): Promise<Interview> {
  const interview: Interview = {
    id: randomUUID(),
    token: randomBytes(16).toString("hex"),
    ownerId: job.ownerId,
    jobId: job.id,
    candidateName,
    status: "invited",
    queue: [],
    current: 0,
    createdAt: Date.now(),
    ...extra,
  };
  return withDb((db) => {
    db.interviews[interview.token] = interview;
    return interview;
  });
}

const orderedRequirements = (job: Job) => [...job.requirements].sort((a, b) => a.tier - b.tier);

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

function finish(i: Interview, job: Job, timedOut = false) {
  i.status = "completed";
  if (timedOut) i.timedOut = true;
  i.result = computeSuitability(job.requirements, requirementScores(i));
}

export const isInviteExpired = (i: Interview) => i.status === "invited" && Boolean(i.dueAt && Date.now() > i.dueAt);

// Generates every question up front, ordered tier by tier, covering all requirements.
// The timer starts here, once the candidate has pressed Begin.
export async function startInterview(token: string): Promise<Interview | null> {
  const db = await readDb();
  const interview = db.interviews[token];
  if (!interview) return null;
  if (interview.status !== "invited") return interview;
  if (isInviteExpired(interview)) return interview;
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
      i.startedAt = Date.now();
      const minutes = d.jobs[i.jobId]?.timeLimitMinutes;
      if (minutes) i.deadlineAt = i.startedAt + minutes * 60_000;
    }
    return i;
  });
}

// Closes the interview once its deadline (plus `afterMs`) has passed.
export async function expireIfNeeded(token: string, afterMs: number): Promise<Interview | null> {
  const db = await readDb();
  const i = db.interviews[token];
  if (!i || i.status !== "in_progress" || !i.deadlineAt || Date.now() < i.deadlineAt + afterMs) return i ?? null;
  return withDb((d) => {
    const x = d.interviews[token];
    if (x.status === "in_progress") finish(x, d.jobs[x.jobId], true);
    return x;
  });
}

export async function submitAnswer(token: string, answer: string): Promise<Interview | null> {
  const text = answer.trim().slice(0, MAX_ANSWER_LENGTH);
  const db = await readDb();
  const interview = db.interviews[token];
  if (!interview || interview.status !== "in_progress" || !text) return interview ?? null;
  if (interview.deadlineAt && Date.now() > interview.deadlineAt + ANSWER_GRACE_MS) {
    return expireIfNeeded(token, 0);
  }
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
    if (i.status !== "in_progress" || !cur || cur.answer !== undefined) return i;
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
    if (shouldStopEarly(j.requirements, requirementScores(i))) i.stoppedEarly = true;

    i.current += 1;
    const outOfTime = Boolean(i.deadlineAt && Date.now() >= i.deadlineAt);
    if (i.stoppedEarly || outOfTime || i.current >= i.queue.length) finish(i, j, outOfTime && !i.stoppedEarly);
    return i;
  });
}

// Candidate-safe view: never exposes scores or rationale.
export function candidateView(i: Interview, job: Job) {
  const q = i.status === "in_progress" ? i.queue[i.current] : undefined;
  const req = q ? job.requirements.find((r) => r.id === q.requirementId) : undefined;
  return {
    candidateName: i.candidateName,
    jobTitle: job.title,
    status: i.status,
    total: i.queue.length,
    index: i.current,
    timeLimitMinutes: job.timeLimitMinutes ?? null,
    deadlineAt: i.deadlineAt ?? null,
    dueAt: i.dueAt ?? null,
    expired: isInviteExpired(i),
    timedOut: Boolean(i.timedOut),
    serverNow: Date.now(),
    question: q ? { text: q.text, requirement: req?.name, tier: req?.tier } : null,
  };
}

// Recruiter view includes full scoring details.
export function recruiterView(i: Interview, job: Job) {
  return {
    ...candidateView(i, job),
    startedAt: i.startedAt ?? null,
    queue: i.queue,
    result: i.result,
    stoppedEarly: i.stoppedEarly,
  };
}
