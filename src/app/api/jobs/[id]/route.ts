import { requireUser, unauthorized } from "@/lib/auth";
import { withDb } from "@/lib/store";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  const { id } = await ctx.params;
  const removed = await withDb((db) => {
    if (db.jobs[id]?.ownerId !== user.id) return false;
    delete db.jobs[id];
    for (const [token, i] of Object.entries(db.interviews)) if (i.jobId === id) delete db.interviews[token];
    return true;
  });
  return removed ? Response.json({ ok: true }) : Response.json({ error: "Job not found" }, { status: 404 });
}
