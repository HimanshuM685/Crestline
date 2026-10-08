import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { PDFDocument } from "pdf-lib";
import { composeGuide, collectStylesheets } from "../lib/extract";
import { normalizeQuery, publicUrl, brandPages } from "../lib/url";
import { generateGuide } from "../lib/generate";
import { TinyFish } from "../lib/tinyfish";
import { readEvents } from "../lib/stream";
import { buildPdf } from "../lib/pdf";
import { storeReport } from "../lib/store";
import { GET } from "../app/api/report/[id]/route";
import { POST } from "../app/api/generate/route";
import type { BrandGuide, FetchPage, StreamEvent } from "../lib/schema";

const homepage = "https://example.com/";
const headline = "Build a better way to work with your team.";
const page: FetchPage = { url: homepage, title: "Example — Home", text: `<html><head><meta property="og:site_name" content="Example"><link rel="stylesheet" href="/theme.css"><link rel="icon" href="/favicon.png"><link as="font" href="/fonts/ExampleSans.woff2"></head><body><main><h1><span aria-hidden="true">${headline}${headline}</span><span class="visually-hidden">${headline}</span></h1><h2>Everything your team needs, in one place.</h2><img src="/logo.svg" alt="Example logo"><img src="/photo.jpg" alt="Overhead view of an intersection imitating the Example logo."><button>Start building</button><a href="/about">About</a><div style="--accent: #123456">An illustration</div></main></body></html>` };
const sheet: FetchPage = { url: "https://example.com/theme.css", text: `:root { --brand-primary: #123456; --color-background: #fff; --color-text-primary: var(--ink); --ink: #234567; --font-weight: 400; --font-size: 12px; --font-body: "Example Sans", sans-serif; } @font-face { font-family: "Example Sans"; src: url('/font.woff2'); } body { background: #fff; color: #111; }` };

function fixture() {
  return composeGuide({ query: "Example", homepage, html: [page], markdown: [{ url: homepage, text: `# ${headline}\n\nMake space for the work that matters to your team.` }], stylesheets: [sheet], agent: { colors: [{ hex: "#123456", role: "Agent role", location: "button" }, { hex: "#FF8800", role: "Accent", location: "CTA computed color" }], fonts: [{ family: "Rendered Sans", role: "Heading" }] }, calls: [], reportId: "test-report" });
}

test("input normalization distinguishes names and domains, rejects private URLs and strips tracking", () => {
  assert.deepEqual(normalizeQuery("linear.app"), { url: "https://linear.app/" });
  assert.deepEqual(normalizeQuery("Stripe"), { name: "Stripe" });
  assert.equal(publicUrl("http://127.0.0.1/"), null);
  assert.equal(publicUrl("http://2130706433/"), null);
  assert.equal(publicUrl("https://192.168.1.2/"), null);
  assert.equal(publicUrl("https://localhost/"), null);
  assert.equal(publicUrl("file:///etc/passwd"), null);
  assert.equal(publicUrl("https://example.com/about?srsltid=test&utm_source=test"), "https://example.com/about");
  assert.throws(() => normalizeQuery("ftp://example.com"));
  assert.deepEqual(brandPages(["https://example.com/about", "https://example.com/about?utm_source=search", "https://other.com/brand", "https://example.com/pages/our-story", "https://example.com/pricing"], homepage), ["https://example.com/about", "https://example.com/pages/our-story"]);
});

test("composition keeps exact copy, identifies font evidence, excludes illustration logos and preserves Fetch colours", () => {
  const guide = fixture();
  assert.equal(guide.messaging.headline, headline);
  assert.equal(guide.brand.tagline, headline);
  assert.equal(guide.messaging.headlineSource?.url, homepage);
  assert.ok(guide.logo.some((logo) => logo.url === "https://example.com/logo.svg"));
  assert.ok(!guide.logo.some((logo) => logo.url.endsWith("photo.jpg")));
  assert.equal(guide.palette.find((item) => item.hex === "#123456")?.source.method, "stylesheet");
  assert.equal(guide.palette.find((item) => item.hex === "#FF8800")?.source.method, "agent");
  assert.equal(guide.palette.find((item) => item.hex === "#234567")?.role, "Text");
  assert.ok(guide.typography.some((font) => font.family === "Example Sans"));
  assert.ok(guide.typography.every((font) => !/^[\d.]/.test(font.family)));
  assert.equal(guide.voice.quotes[0].text, headline);
  assert.ok(guide.voice.attributes.some((attribute) => attribute.name === "Direct"));
  assert.equal(collectStylesheets([{ ...page, text: '<link rel="stylesheet" href="/chunk.css"><link rel="stylesheet" href="/layout.theme.css">' }])[0], "https://example.com/layout.theme.css");
});

test("TinyFish pipeline resolves official names, fetches linked CSS, and records partial and Agent failures", async (context) => {
  const requests: { url: string; body?: { format?: string; urls?: string[]; agent_config?: { max_steps?: number; mode?: string; max_duration_seconds?: number }; goal?: string } }[] = [];
  context.mock.method(globalThis, "fetch", async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    requests.push({ url, body });
    assert.equal(new Headers(init?.headers).get("X-API-Key"), "test-session-key");
    assert.equal(new Headers(init?.headers).get("X-TF-Request-Origin"), "crestline-next");
    if (url.includes("api.search")) return Response.json({ results: url.includes("site%3A") ? [{ title: "About", url: "https://example.com/about" }] : [{ title: "Example", url: "https://linkedin.com/company/example" }, { title: "Example official website", url: homepage }] });
    if (url.includes("agent.tinyfish")) return new Response(JSON.stringify({ error: { code: "FORBIDDEN", message: "Agent capability is unavailable for this account" } }), { status: 403, headers: { "X-Request-ID": "req-test-agent" } });
    if (body.urls.includes(sheet.url)) return Response.json({ results: [sheet], errors: [] });
    return Response.json({ results: body.format === "markdown" ? [{ url: homepage, text: `# ${headline}` }] : [page], errors: body.urls.length > 1 ? [{ url: "https://example.com/about", error: "page_not_found" }] : [] });
  });
  const progress: string[] = [];
  const guide = await generateGuide("Example", new TinyFish("test-session-key"), (step) => progress.push(step));
  assert.deepEqual([...new Set(progress)], ["resolve", "search", "fetch", "agent", "compose"]);
  assert.deepEqual([...guide.tinyfish.endpoints].sort(), ["agent", "fetch", "search"]);
  assert.equal(guide.tinyfish.calls.find((call) => call.endpoint === "agent")?.status, "failed");
  assert.match(guide.tinyfish.calls.find((call) => call.endpoint === "agent")?.error ?? "", /FORBIDDEN: Agent capability is unavailable/);
  assert.ok(guide.tinyfish.calls.some((call) => call.url.endsWith("/about") && call.status === "failed"));
  assert.ok(requests.some(({ body }) => body?.urls?.includes(sheet.url)));
  const agentRequest = requests.find(({ url }) => url.includes("agent.tinyfish"));
  assert.equal(agentRequest?.body?.agent_config, undefined);
  assert.match(agentRequest?.body?.goal ?? "", /short, focused visit/);
  assert.ok(!JSON.stringify(guide).includes("test-session-key"));
  assert.equal(guide.palette[0].source.method, "stylesheet");
});

test("Agent succeeds with the standard request shape and its structured result is composed", async (context) => {
  let agentBody: Record<string, unknown> | undefined;
  context.mock.method(globalThis, "fetch", async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const body = typeof init?.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : undefined;
    if (url.includes("api.search")) return Response.json({ results: [] });
    if (url.includes("agent.tinyfish")) {
      agentBody = body;
      return Response.json({ status: "COMPLETED", result: { logoUrl: "https://example.com/agent-logo.svg", colors: [{ hex: "#ABCDEF", role: "Agent accent", location: "computed button background" }], fonts: [{ family: "Agent Sans", role: "Heading" }], headline: "Agent observed headline", cta: "Start now", quotes: ["An exact rendered line from the homepage."] } });
    }
    if (body?.urls && (body.urls as string[]).includes(sheet.url)) return Response.json({ results: [sheet] });
    return Response.json({ results: body?.format === "markdown" ? [{ url: homepage, text: "# A source heading\n\nA source sentence long enough to quote from the homepage." }] : [page] });
  });
  const client = new TinyFish("test-session-key");
  const guide = await generateGuide(homepage, client, () => undefined);
  assert.equal(agentBody?.url, homepage);
  assert.equal(agentBody?.agent_config, undefined);
  assert.equal(guide.tinyfish.calls.find((call) => call.endpoint === "agent")?.status, "completed");
  assert.equal(guide.logo[0]?.url, "https://example.com/agent-logo.svg");
  assert.equal(guide.palette.find((colour) => colour.hex === "#ABCDEF")?.source.method, "agent");
  assert.equal(guide.messaging.headline, headline);
  assert.ok(guide.voice.quotes.some((quote) => quote.text === "An exact rendered line from the homepage."));
});

test("stream reader handles split UTF-8, CRLF, heartbeat frames and incomplete streams", async () => {
  const events: StreamEvent[] = [{ type: "progress", step: "fetch", detail: "Reading the brand’s pages" }, { type: "guide", guide: fixture() }];
  const bytes = new TextEncoder().encode(`: working\r\n\r\ndata: ${JSON.stringify(events[0])}\r\n\r\ndata: ${JSON.stringify(events[1])}\n\n`);
  const stream = new ReadableStream({ start(controller) { for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7)); controller.close(); } });
  const seen: StreamEvent[] = [];
  await readEvents(new Response(stream), (event) => seen.push(event));
  assert.deepEqual(seen, events);
  await assert.rejects(readEvents(new Response(`data: ${JSON.stringify(events[0])}\n\n`), () => {}), /ended before/);
});

test("server PDF has exactly four pages and attachments are immediately available by report id", async () => {
  const guide = fixture();
  const pdf = await buildPdf(guide);
  const document = await PDFDocument.load(pdf);
  assert.equal(document.getPageCount(), 4);
  storeReport(guide, pdf);
  for (const format of ["json", "pdf"]) {
    const response = await GET(new Request(`http://localhost/api/report/${guide.reportId}?format=${format}`), { params: Promise.resolve({ id: guide.reportId }) });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("Content-Disposition") ?? "", /attachment/);
    if (format === "json") assert.deepEqual(await response.json(), guide);
    else assert.equal((await response.arrayBuffer()).byteLength, pdf.length);
  }
  assert.equal((await GET(new Request("http://localhost/api/report/missing"), { params: Promise.resolve({ id: "missing" }) })).status, 404);
  assert.equal((await GET(new Request("http://localhost/api/report/test?format=csv"), { params: Promise.resolve({ id: "test" }) })).status, 400);
});

test("generate route rejects malformed requests and a missing key with actionable responses", async () => {
  assert.equal((await POST(new Request("http://localhost/api/generate", { method: "POST", body: "not-json" }))).status, 400);
  assert.equal((await POST(new Request("http://localhost/api/generate", { method: "POST", body: JSON.stringify({ query: 123 }) }))).status, 400);
  const previous = process.env.TINYFISH_API_KEY;
  delete process.env.TINYFISH_API_KEY;
  try {
    const response = await POST(new Request("http://localhost/api/generate", { method: "POST", body: JSON.stringify({ query: "Example" }) }));
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /recorded report/);
  } finally { if (previous) process.env.TINYFISH_API_KEY = previous; }
});

test("generate route streams completion only after JSON and PDF downloads are ready", async (context) => {
  context.mock.method(globalThis, "fetch", async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    if (url.includes("api.search")) return Response.json({ results: [] });
    if (url.includes("agent.tinyfish")) return Response.json({ status: "COMPLETED", result: { colors: [], fonts: [], quotes: [] } });
    if (body.urls.includes(sheet.url)) return Response.json({ results: [sheet] });
    return Response.json({ results: body.format === "markdown" ? [{ url: homepage, text: `# ${headline}` }] : [page] });
  });
  const response = await POST(new Request("http://localhost/api/generate", { method: "POST", body: JSON.stringify({ query: homepage, apiKey: "test-key" }) }));
  assert.equal(response.headers.get("Content-Type"), "text/event-stream; charset=utf-8");
  const completed: BrandGuide[] = [];
  await readEvents(response, (event) => { if (event.type === "guide") completed.push(event.guide); if (event.type === "error") assert.fail(event.error); });
  assert.equal(completed.length, 1);
  const download = await GET(new Request(`http://localhost/api/report/${completed[0].reportId}?format=pdf`), { params: Promise.resolve({ id: completed[0].reportId }) });
  assert.equal(download.status, 200);
  assert.equal((await PDFDocument.load(await download.arrayBuffer())).getPageCount(), 4);
});

test("all recorded guides conform to the shared contract and ship four-page PDFs", async () => {
  const schema = JSON.parse(await readFile(new URL("../brand-guide.schema.json", import.meta.url), "utf8"));
  const ajv = new Ajv2020({ allErrors: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  assert.ok(validate(fixture()), JSON.stringify(validate.errors));
  for (const brand of ["linear", "stripe", "allbirds"]) {
    const guide = JSON.parse(await readFile(new URL(`../public/demos/${brand}.json`, import.meta.url), "utf8")) as BrandGuide;
    assert.ok(validate(guide), `${brand}: ${JSON.stringify(validate.errors)}`);
    assert.equal(guide.recorded, true);
    assert.ok(guide.sources.some((source) => source.kind === "brand"));
    assert.ok(guide.palette.length > 0);
    assert.ok(guide.typography.length > 0);
    assert.ok(guide.typography.every((font) => !/^[\d.]/.test(font.family)));
    const pdf = await PDFDocument.load(await readFile(new URL(`../public/demos/${brand}.pdf`, import.meta.url)));
    assert.equal(pdf.getPageCount(), 4);
  }
});
