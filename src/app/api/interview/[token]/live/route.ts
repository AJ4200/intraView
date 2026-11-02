import { requireUser, unauthorized } from "@/lib/auth";
import { ABANDON_MS, expireIfNeeded, recruiterView } from "@/lib/engine";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

// Server-Sent Events stream so the owning recruiter watches the interview live.
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const user = await requireUser(req);
  if (!user) return unauthorized();
  const { token } = await ctx.params;
  const first = (await readDb()).interviews[token];
  if (!first || first.ownerId !== user.id) return Response.json({ error: "Not found" }, { status: 404 });

  const enc = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(timer);
        try {
          controller.close();
        } catch {}
      };
      const tick = async () => {
        if (closed) return;
        try {
          const i = await expireIfNeeded(token, ABANDON_MS);
          if (!i) return close();
          const job = (await readDb()).jobs[i.jobId];
          controller.enqueue(enc.encode(`data: ${JSON.stringify(recruiterView(i, job))}\n\n`));
          if (i.status === "completed") close();
        } catch {
          close();
        }
      };
      void tick();
      timer = setInterval(tick, 1500);
      req.signal.addEventListener("abort", close);
    },
    cancel() {
      closed = true;
      clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform" },
  });
}
