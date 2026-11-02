import { randomUUID } from "crypto";
import { requireUser, unauthorized } from "@/lib/auth";
import { clampLimit } from "@/lib/timing";
import { readDb, withDb, type Job } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  const jobs = Object.values((await readDb()).jobs)
    .filter((j) => j.ownerId === user.id)
    .sort((a, b) => b.createdAt - a.createdAt);
  return Response.json(jobs);
}

export async function POST(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim().slice(0, 120);
  const reqs: unknown[] = Array.isArray(body?.requirements) ? body.requirements.slice(0, 30) : [];
  const requirements = reqs
    .map((r) => r as Record<string, unknown>)
    .filter((r) => String(r?.name ?? "").trim())
    .map((r) => ({
      id: randomUUID(),
      name: String(r.name).trim().slice(0, 120),
      description: r.description ? String(r.description).slice(0, 500) : undefined,
      tier: ([1, 2, 3].includes(Number(r.tier)) ? Number(r.tier) : 2) as 1 | 2 | 3,
      weight: Number(r.weight) > 0 ? Math.min(100, Number(r.weight)) : 1,
      isRequired: Boolean(r.isRequired),
      minScore: Number.isFinite(Number(r.minScore)) ? Math.min(100, Math.max(0, Number(r.minScore))) : 50,
    }));
  if (!title || requirements.length === 0) {
    return Response.json({ error: "title and at least one requirement are required" }, { status: 400 });
  }

  const job: Job = {
    id: randomUUID(),
    ownerId: user.id,
    title,
    description: body.description ? String(body.description).slice(0, 1000) : undefined,
    timeLimitMinutes: clampLimit(body.timeLimitMinutes),
    createdAt: Date.now(),
    requirements,
  };
  await withDb((db) => {
    db.jobs[job.id] = job;
  });
  return Response.json(job, { status: 201 });
}
