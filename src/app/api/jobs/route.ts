import { randomUUID } from "crypto";
import { requireUser, unauthorized } from "@/lib/auth";
import { parseJobInput } from "@/lib/jobInput";
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
  const input = parseJobInput(await req.json().catch(() => null));
  if (!input) {
    return Response.json({ error: "title and at least one requirement are required" }, { status: 400 });
  }
  const job: Job = { id: randomUUID(), ownerId: user.id, createdAt: Date.now(), ...input };
  await withDb((db) => {
    db.jobs[job.id] = job;
  });
  return Response.json(job, { status: 201 });
}
