import { candidateView, submitAnswer } from "@/lib/engine";
import { sameOrigin } from "@/lib/auth";
import { readDb } from "@/lib/store";

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  if (!sameOrigin(req)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { token } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (typeof body?.answer !== "string" || !body.answer.trim()) {
    return Response.json({ error: "answer is required" }, { status: 400 });
  }
  const interview = await submitAnswer(token, body.answer);
  if (!interview) return Response.json({ error: "Interview not found" }, { status: 404 });
  const job = (await readDb()).jobs[interview.jobId];
  return Response.json(candidateView(interview, job));
}
