import { candidateView, expireIfNeeded, ABANDON_MS } from "@/lib/engine";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

// Read-only: opening the link shows the intro. The interview (and timer) starts via /start.
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const interview = await expireIfNeeded(token, ABANDON_MS);
  if (!interview) return Response.json({ error: "Interview not found" }, { status: 404 });
  const job = (await readDb()).jobs[interview.jobId];
  if (!job) return Response.json({ error: "Interview not found" }, { status: 404 });
  return Response.json(candidateView(interview, job), { headers: { "Cache-Control": "no-store" } });
}
