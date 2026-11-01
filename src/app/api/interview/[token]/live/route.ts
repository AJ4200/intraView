import { isAdmin, unauthorized } from "@/lib/auth";
import { recruiterView } from "@/lib/engine";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

// Server-Sent Events stream so recruiters watch the interview live.
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  if (!isAdmin(req)) return unauthorized();
  const { token } = await ctx.params;
  const enc = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  let closed = false;
  let last = "";

  const stream = new ReadableStream({
    start(controller) {
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(timer);
        controller.close();
      };
      const tick = async () => {
        if (closed) return;
        const db = await readDb();
        const i = db.interviews[token];
        if (!i) {
          controller.enqueue(enc.encode(`event: error\ndata: not found\n\n`));
          return close();
        }
        const data = JSON.stringify(recruiterView(i, db.jobs[i.jobId]));
        if (data !== last) {
          last = data;
          controller.enqueue(enc.encode(`data: ${data}\n\n`));
        }
        if (i.status === "completed") close();
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
