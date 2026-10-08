# Crestline

A crest is the mark. A line is the voice. Crestline turns a company name or public website into a sourced brand guide for a deck, document, or another agent.

**Next.js App Router · TypeScript · TinyFish · server-rendered PDF**

## Run locally

Requires Node.js 22 or later.

```sh
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000). The recorded Linear, Stripe, and Allbirds reports work immediately without a key.

For live generation, set `TINYFISH_API_KEY` in the server environment or paste a key into the collapsed **Session key** field. The field is stored in this tab's `sessionStorage` and sent in the generate request. Request keys are never logged, included in a report, or written to disk. A request key takes precedence over the environment key.

```sh
export TINYFISH_API_KEY="your-key"
npm run dev
```

To run a production build:

```sh
npm run build
npm start
```

## The three TinyFish endpoints

All TinyFish HTTP calls are implemented in `lib/tinyfish.ts`; the browser calls only Crestline's route handlers. Each request uses the `X-API-Key` header.

| Endpoint | Job |
| --- | --- |
| `GET https://api.search.tinyfish.ai` | Resolve a plain company name to an official homepage, then search `site:{domain}` for about, story, brand, and press pages. Social sites and news aggregators are excluded from name resolution. |
| `POST https://api.fetch.tinyfish.ai` | Fetch initial homepage HTML, then the homepage and up to three discovered source pages in separate HTML and markdown batches, and up to six linked stylesheets. |
| `POST https://agent.tinyfish.ai/v1/automation/run` | Observe the homepage's rendered mark, computed colours and font families, headline, CTA, and three exact lines. Runs alongside Fetch with a focused, 90-second budget. |

Fetch uses `ttl: 0` for a fresh capture and `include_selectors: ["html"]` for page HTML. Default Fetch HTML is semantic content; selector scoping preserves head links for logo, font, and stylesheet discovery. Stylesheet selection prioritizes global, layout, theme, and token files ahead of utility chunks. Agent can supply additional linked stylesheet URLs if the page extraction omitted them.

`tinyfish.endpoints` lists attempted endpoints, including failed attempts. `tinyfish.calls` records each query or target URL, format, purpose, status, and any failure. A per-URL Fetch failure is retained in the call history. A failed Agent call returns a usable Fetch-backed guide.

The shipped recordings were captured from real public pages. The recording key accepted Search and Fetch but returned HTTP 403 for Agent; that failure is visible in each report's call history. They are labelled **recorded samples**, never presented as a current live run.

## Evidence and extraction

`brand-guide.schema.json` is the reusable JSON contract; `lib/schema.ts` is its TypeScript counterpart.

- **Mark:** image, asset-link, favicon, and social-image candidates, with their source page. Inline SVG wordmarks without a standalone asset URL may remain unavailable when Agent cannot observe them.
- **Colour:** literal hex/RGB evidence and resolvable stylesheet tokens, labelled by CSS property and selector. Theme-specific tokens are filtered when the homepage exposes its theme. Stylesheet evidence outranks inline illustration colours; Agent does not replace a Fetch-extracted hex.
- **Type:** `@font-face`, family declarations, font-family variables, preloaded font files, and separately labelled rendered observations. Font file identifiers are labelled as resources; generic fallback stacks are filtered. A declared font is evidence of availability, not a claim that every element uses it.
- **Voice:** short, verbatim markdown lines and headings, with source URLs. Local heuristics derive concise/direct/action-led attributes only when a source quotation supports them. The do/don't guidance describes those observed patterns.
- **Messaging:** source headlines, descriptions, section headings, and CTA labels. No new taglines, artwork, or hex values are generated.

Missing evidence is displayed explicitly. External logo previews load from their original URLs. The guide uses Crestline's own type for specimens rather than downloading a site's licensed font files.

## API

### `POST /api/generate`

```json
{ "query": "Stripe", "apiKey": "optional-request-key" }
```

A successful request opens a `text/event-stream` with JSON data events:

```text
data: {"type":"progress","step":"fetch","detail":"Fetching the live pages"}

data: {"type":"guide","guide":{"reportId":"short-id","brand":{},"...":"BrandGuide fields"}}

data: {"type":"error","error":"Actionable error message"}
```

The progress steps are `resolve`, `search`, `fetch`, `agent`, and `compose`. Fetch and Agent overlap, so progress details can revisit Fetch when additional stylesheets are discovered. Comment heartbeats keep the stream active. Invalid input or a missing key returns HTTP 400 JSON before opening the stream; generation failures use an error event.

The PDF is built and both exports are stored **before** the guide event is emitted. Cancellation aborts the upstream HTTP requests.

### `GET /api/report/[id]?format=json|pdf`

Returns an attachment with the appropriate content type. JSON is the default format; unknown formats return 400. Unknown ids return 404 with a regenerate message. There is no list endpoint or user identifier.

## Four-page PDF

Built on the server with `@react-pdf/renderer`:

1. **Cover:** name, extracted headline, domain, palette strip.
2. **Mark & colour:** raster logo where available, otherwise its URL; hexes, roles, and evidence sources.
3. **Type & voice:** font families, observed attributes, do/don't guidance, source quotations.
4. **Messaging & sources:** headline, messaging pillars, CTAs, source pages, endpoint history.

The report uses an extracted accent colour. Raster embedding is bounded; unsupported or unreachable assets fall back to a URL. The PDF is a compact handoff; JSON and the on-page guide contain the full call history and complete evidence.

## Record the demo set

With `TINYFISH_API_KEY` set:

```sh
npm run demos:record
# Or refresh one recording:
npm run demos:record -- stripe
```

This runs the same pipeline as live generation, labels the results recorded, and writes matching JSON/PDF files plus a small palette index to `public/demos/`. The script never persists the key.

## Verify

```sh
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:ui
```

Core tests cover name/domain handling, exact copy, logo filtering, stylesheet precedence, partial endpoint failures, split UTF-8 SSE, completion-before-download, the shared schema, and four-page PDFs. The browser check uses the production build on port 4321 and checks desktop/mobile layouts, session-key recovery, recorded reports, and both downloads. With `TINYFISH_API_KEY` set in the test process, it also runs a live HTTP generation and immediate attachment checks. Browser screenshots are written to the ignored `.impeccable/review/` directory.

## Structure

```text
app/
  page.tsx                       # Single product route
  layout.tsx
  globals.css
  components/
    workspace.tsx                # Input, session key, SSE progress, demo loader
    guide-view.tsx               # Sourced guide and attachment downloads
  api/generate/route.ts          # Streaming generation
  api/report/[id]/route.ts       # PDF/JSON attachments
lib/
  tinyfish.ts                    # All three endpoint clients
  generate.ts                    # Shared orchestration
  extract.ts                     # Evidence parsing and guide composition
  pdf.tsx                        # Four-page report
  schema.ts                      # BrandGuide contract
  store.ts                       # Process-local report map
  stream.ts                      # Incremental browser SSE parser
  url.ts                         # URL normalization and discovery
public/demos/                    # Real recorded JSON/PDF pairs
scripts/record-demos.ts
tests/core.test.ts
brand-guide.schema.json
```

## Report lifetime

Reports and PDF buffers live in a process-local map for that process's lifetime. A restart clears them. Run a single long-lived Node process when downloads must reliably reach the instance that generated them. Multiple isolated or serverless instances have separate maps and can return 404 for an id generated elsewhere. Recorded reports are static files and remain available across restarts.

No accounts, database, middleware auth, email field, billing, or saved-report library.
