import { randomBytes } from "node:crypto";
import { brandPages, normalizeQuery, publicUrl } from "./url";
import { composeGuide, collectLinks, collectStylesheets } from "./extract";
import type { BrandGuide, Step } from "./schema";
import type { TinyFishClient } from "./tinyfish";

const EXCLUDED_SITES = /(?:^|\.)(?:wikipedia\.org|linkedin\.com|facebook\.com|instagram\.com|x\.com|twitter\.com|crunchbase\.com|bloomberg\.com|reuters\.com|techcrunch\.com|youtube\.com|medium\.com|reddit\.com)$/i;

export async function generateGuide(query: string, client: TinyFishClient, progress: (step: Step, detail: string) => void): Promise<BrandGuide> {
  progress("resolve", "Finding the company’s official website");
  const input = normalizeQuery(query);
  let homepage = input.url;
  if (!homepage) {
    const results = await client.search(`${input.name} official website`, "Resolve the company's official homepage, excluding news and social profiles");
    const candidates = results.filter((result) => !EXCLUDED_SITES.test(new URL(result.url).hostname));
    const words = (input.name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const official = candidates.find((result) => new URL(result.url).hostname.replace(/[^a-z0-9]/g, "").includes(words)) ?? candidates.find((result) => result.title.toLowerCase().includes((input.name ?? "").toLowerCase()));
    if (!official) throw new Error("Couldn’t identify an official website. Try its domain instead.");
    homepage = publicUrl(official.url) ?? undefined;
    if (homepage) homepage = new URL("/", homepage).href;
  }
  if (!homepage) throw new Error("Couldn’t resolve that company. Try a public website URL.");
  const domain = new URL(homepage).hostname.replace(/^www\./, "");
  progress("search", `Looking for about, story and brand pages on ${domain}`);

  // Start both evidence paths as soon as the official homepage is known.
  const agentPromise = client.agent(homepage);
  const searchPromise = client.search(`site:${domain} (about OR story OR brand OR press)`, "Discover official about, story, press and brand pages").catch(() => []);
  progress("fetch", "Fetching the live homepage and collecting stylesheet links");
  const initial = await client.fetchPages([homepage], "html", "Inspect homepage HTML for logo, font and stylesheet links", true);
  if (!initial.length) throw new Error("The homepage could not be fetched. Check the URL or try another public site.");
  const canonical = publicUrl(initial[0].final_url ?? homepage) ?? homepage;
  const results = await searchPromise;
  const pages = [canonical, ...brandPages([...results.map((result) => result.url), ...initial.flatMap(collectLinks)], canonical)];
  progress("fetch", `Reading ${pages.length} source page${pages.length === 1 ? "" : "s"} as HTML and quoted copy`);
  const pageEvidence = Promise.all([
    client.fetchPages(pages, "html", "Extract page structure, marks, typography and CTAs", true).catch(() => initial),
    client.fetchPages(pages, "markdown", "Collect verbatim headings and sentences for voice and messaging").catch(() => []),
  ]);
  const firstStyles = collectStylesheets(initial).slice(0, 6);
  const stylePromise = client.fetchPages(firstStyles, "html", "Read linked stylesheets for colour and font tokens").catch(() => []);
  progress("agent", "Checking rendered colours and type alongside the page fetches");
  const [[html, markdown], firstCss, agent] = await Promise.all([pageEvidence, stylePromise, agentPromise]);
  // Clean semantic HTML can omit the head. Rendered DOM observations supply
  // missing stylesheet URLs; all stylesheet content still goes through Fetch.
  const extraStyles = [...collectStylesheets(html), ...(Array.isArray(agent?.stylesheetUrls) ? agent.stylesheetUrls.filter((value): value is string => typeof value === "string") : [])]
    .map((url) => publicUrl(url, canonical)).filter((url): url is string => !!url)
    .filter((url) => !firstStyles.includes(url));
  const remaining = [...new Set(extraStyles)].slice(0, 6 - firstStyles.length);
  if (remaining.length) progress("fetch", "Reading the linked design-token stylesheets");
  const extraCss = await client.fetchPages(remaining, "html", "Read linked stylesheets for colour and font tokens").catch(() => []);
  progress("compose", "Structuring the evidence and preparing your four-page report");
  return composeGuide({
    query, homepage: canonical, html: [...new Map([...initial, ...html].map((page) => [page.final_url ?? page.url, page])).values()], markdown,
    stylesheets: [...firstCss, ...extraCss], agent, calls: client.calls,
    reportId: randomBytes(6).toString("base64url"),
  });
}
