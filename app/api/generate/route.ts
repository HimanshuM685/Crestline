import { generateGuide } from "@/lib/generate";
import { TinyFish, friendlyError } from "@/lib/tinyfish";
import { buildPdf } from "@/lib/pdf";
import { storeReport } from "@/lib/store";
import type { StreamEvent } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  let body: { query?: unknown; apiKey?: unknown };
  try { body = await request.json(); }
  catch { return Response.json({ error: "Send a JSON object with a company name or URL." }, { status: 400 }); }
  if (!body || typeof body !== "object" || typeof body.query !== "string" || !body.query.trim() || body.query.length > 300) return Response.json({ error: "Enter a company name or public website, up to 300 characters." }, { status: 400 });
  if (body.apiKey !== undefined && (typeof body.apiKey !== "string" || body.apiKey.length > 500)) return Response.json({ error: "The session key must be a string, up to 500 characters." }, { status: 400 });
  const key = (typeof body.apiKey === "string" ? body.apiKey.trim() : "") || process.env.TINYFISH_API_KEY;
  if (!key) return Response.json({ error: "Add a TinyFish key in Session key, or open a recorded report below." }, { status: 400 });
  const query = body.query;
  const encoder = new TextEncoder();
  const abort = new AbortController();
  const signal = AbortSignal.any([request.signal, abort.signal]);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: StreamEvent) => { if (!closed && !signal.aborted) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)); };
      const heartbeat = setInterval(() => { if (!closed && !signal.aborted) controller.enqueue(encoder.encode(": working\n\n")); }, 15_000);
      try {
        const client = new TinyFish(key, signal);
        const guide = await generateGuide(query, client, (step, detail) => send({ type: "progress", step, detail }));
        if (signal.aborted) return;
        const pdf = await buildPdf(guide);
        if (signal.aborted) return;
        storeReport(guide, pdf);
        send({ type: "guide", guide });
      } catch (error) { send({ type: "error", error: friendlyError(error) }); }
      finally { clearInterval(heartbeat); closed = true; if (!signal.aborted) controller.close(); }
    },
    cancel() { abort.abort(); },
  });
  return new Response(stream, { headers: {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-store, no-transform",
    "Connection": "keep-alive", "X-Accel-Buffering": "no",
  } });
}
