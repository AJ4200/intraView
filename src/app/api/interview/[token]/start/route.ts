import { candidateView, isInviteExpired, startInterview } from "@/lib/engine";
import { sameOrigin } from "@/lib/auth";
import { readDb } from "@/lib/store";

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  if (!sameOrigin(req)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { token } = await ctx.params;
  const interview = await startInterview(token);
  if (!interview) return Response.json({ error: "Interview not found" }, { status: 404 });
  if (isInviteExpired(interview)) return Response.json({ error: "This invitation has expired." }, { status: 410 });
  const job = (await readDb()).jobs[interview.jobId];
  return Response.json(candidateView(interview, job));
}
