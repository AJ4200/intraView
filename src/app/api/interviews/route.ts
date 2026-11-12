import { appUrl, requireUser, unauthorized } from "@/lib/auth";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  const db = await readDb();
  const baseUrl = appUrl(req).replace(/\/+$/, "");
  return Response.json(
    Object.values(db.interviews)
      .filter((i) => i.ownerId === user.id)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((i) => ({
        token: i.token,
        candidateName: i.candidateName,
        candidateEmail: i.candidateEmail ?? null,
        jobId: i.jobId,
        jobTitle: db.jobs[i.jobId]?.title,
        timeLimitMinutes: db.jobs[i.jobId]?.timeLimitMinutes ?? null,
        createdAt: i.createdAt,
        dueAt: i.dueAt ?? null,
        startedAt: i.startedAt ?? null,
        inviteLink: `${baseUrl}/i/${i.token}`,
        liveLink: `${baseUrl}/dashboard/live/${i.token}`,
        status: i.status,
        timedOut: Boolean(i.timedOut),
        progress: `${Math.min(i.current, i.queue.length)}/${i.queue.length}`,
        suitability: i.result?.suitability,
        verdict: i.result?.verdict,
      }))
  );
}
