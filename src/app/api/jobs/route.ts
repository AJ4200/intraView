import { randomUUID } from "crypto";
import { isAdmin, unauthorized } from "@/lib/auth";
import { withDb, type Job } from "@/lib/store";

export async function POST(req: Request) {
  if (!isAdmin(req)) return unauthorized();
  const body = await req.json().catch(() => null);
  if (!body?.title || !Array.isArray(body.requirements) || body.requirements.length === 0) {
    return Response.json({ error: "title and requirements[] are required" }, { status: 400 });
  }
  const job: Job = {
    id: randomUUID(),
    title: String(body.title),
    description: body.description ? String(body.description) : undefined,
    requirements: body.requirements.map((r: any) => ({
      id: randomUUID(),
      name: String(r.name),
      description: r.description ? String(r.description) : undefined,
      tier: [1, 2, 3].includes(r.tier) ? r.tier : 2,
      weight: Number(r.weight) > 0 ? Number(r.weight) : 1,
      isRequired: Boolean(r.isRequired),
      minScore: Number.isFinite(Number(r.minScore)) ? Number(r.minScore) : 50,
    })),
  };
  await withDb((db) => {
    db.jobs[job.id] = job;
  });
  return Response.json(job, { status: 201 });
}
