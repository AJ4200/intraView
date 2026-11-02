import { candidateView, expireIfNeeded } from "@/lib/engine";
import { sameOrigin } from "@/lib/auth";
import { readDb } from "@/lib/store";

// The candidate's clock reached zero. A small tolerance covers minor clock differences.
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  if (!sameOrigin(req)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { token } = await ctx.params;
  const interview = await expireIfNeeded(token, -2000);
  if (!interview) return Response.json({ error: "Interview not found" }, { status: 404 });
  const job = (await readDb()).jobs[interview.jobId];
  return Response.json(candidateView(interview, job));
}
