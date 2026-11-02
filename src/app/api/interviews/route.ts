import { requireUser, unauthorized } from "@/lib/auth";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  const db = await readDb();
  return Response.json(
    Object.values(db.interviews)
      .filter((i) => i.ownerId === user.id)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((i) => ({
        token: i.token,
        candidateName: i.candidateName,
        jobId: i.jobId,
        jobTitle: db.jobs[i.jobId]?.title,
        status: i.status,
        timedOut: Boolean(i.timedOut),
        progress: `${Math.min(i.current, i.queue.length)}/${i.queue.length}`,
        suitability: i.result?.suitability,
        verdict: i.result?.verdict,
      }))
  );
}
