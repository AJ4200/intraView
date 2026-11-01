import { candidateView, startInterview } from "@/lib/engine";
import { readDb } from "@/lib/store";

// Opening the link starts the interview automatically and returns the current question.
export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const interview = await startInterview(token);
  if (!interview) return Response.json({ error: "Interview not found" }, { status: 404 });
  const job = (await readDb()).jobs[interview.jobId];
  return Response.json(candidateView(interview, job));
}
