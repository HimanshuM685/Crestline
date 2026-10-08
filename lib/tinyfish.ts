import type { AgentObservation, BrandGuide, FetchPage } from "./schema";
import { publicUrl } from "./url";

export const ENDPOINTS = {
  search: "https://api.search.tinyfish.ai",
  fetch: "https://api.fetch.tinyfish.ai",
  agent: "https://agent.tinyfish.ai/v1/automation/run",
} as const;

export const AGENT_GOAL = `Inspect only this public homepage. Do not sign in, fill forms, or navigate beyond it. Use a short, focused visit and stop once the requested fields are collected. Return JSON only using this shape: {"logoUrl": "absolute logo image URL or null", "colors": [{"hex": "#RRGGBB", "role": "background/text/accent", "location": "visible element and computed CSS property"}], "fonts": [{"family": "computed font family", "role": "heading/body"}], "headline": "exact visible main headline or null", "cta": "exact primary button text or null", "quotes": ["three short lines quoted verbatim from the page"], "stylesheetUrls": ["up to six absolute linked CSS stylesheet URLs from the page DOM"]}. Inspect rendered CSS, do not infer colours from screenshots. Prefer the brand mark over customer logos. Never guess font names, hex values or copy. Omit unavailable observations.`;

type SearchResult = { title: string; url: string; snippet?: string };
type FetchResponse = { results: FetchPage[]; errors?: { url: string; error: string }[] };

export interface TinyFishClient {
  calls: BrandGuide["tinyfish"]["calls"];
  search(query: string, purpose: string): Promise<SearchResult[]>;
  fetchPages(urls: string[], format: "html" | "markdown", purpose: string, fullHtml?: boolean): Promise<FetchPage[]>;
  agent(url: string): Promise<AgentObservation | null>;
}

export class TinyFish implements TinyFishClient {
  readonly calls: BrandGuide["tinyfish"]["calls"] = [];
  constructor(private readonly key: string, private readonly signal?: AbortSignal) {}

  private async request(url: string, body?: object, timeout = 75_000): Promise<unknown> {
    const signal = AbortSignal.any([AbortSignal.timeout(timeout), ...(this.signal ? [this.signal] : [])]);
    const response = await fetch(url, {
      method: body ? "POST" : "GET",
      headers: {
        "X-API-Key": this.key,
        "Accept": "application/json",
        "User-Agent": "crestline-next/1.0",
        "X-TF-Request-Origin": "crestline-next",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: "no-store", signal,
    });
    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      let apiError: { code?: unknown; message?: unknown } | undefined;
      try {
        const parsed = JSON.parse(responseText) as { error?: { code?: unknown; message?: unknown } };
        apiError = parsed.error;
      } catch {
        // Keep the endpoint-specific fallback when the response is not JSON.
      }
      const messages: Record<number, string> = {
        401: "The TinyFish key was not accepted. Check your session key and try again.",
        402: "TinyFish needs available credits for this request.",
        403: "TinyFish rejected this Agent request. Check the account capability or billing status.",
        429: "TinyFish is rate-limiting requests. Wait a moment and try again.",
      };
      const structured = [apiError?.code, apiError?.message].filter((value): value is string => typeof value === "string" && value.length > 0).join(": ");
      const requestId = response.headers.get("x-request-id");
      const suffix = structured || responseText.trim().slice(0, 300);
      throw new Error(`${messages[response.status] ?? `TinyFish returned HTTP ${response.status}. Try again shortly.`}${suffix ? ` ${suffix}` : ""}${requestId ? ` (request ${requestId})` : ""}`);
    }
    return response.json();
  }

  async search(query: string, purpose: string): Promise<SearchResult[]> {
    const url = new URL(ENDPOINTS.search);
    url.searchParams.set("query", query);
    url.searchParams.set("purpose", purpose);
    const call: BrandGuide["tinyfish"]["calls"][number] = { endpoint: "search", url: url.href, format: "json", purpose, status: "completed" };
    this.calls.push(call);
    try {
      const result = await this.request(url.href) as { results?: SearchResult[] };
      if (!Array.isArray(result.results)) throw new Error("TinyFish Search returned an unreadable response.");
      return result.results.filter((item) => typeof item.url === "string" && !!publicUrl(item.url));
    } catch (error) {
      call.status = "failed";
      call.error = friendlyError(error);
      throw error;
    }
  }

  async fetchPages(urls: string[], format: "html" | "markdown", purpose: string, fullHtml = false): Promise<FetchPage[]> {
    const safeUrls = urls.filter((url) => !!publicUrl(url)).slice(0, 10);
    if (!safeUrls.length) return [];
    const calls = safeUrls.map((url) => ({ endpoint: "fetch" as const, url, format, purpose, status: "completed" as "completed" | "failed", error: undefined as string | undefined }));
    this.calls.push(...calls);
    try {
      const result = await this.request(ENDPOINTS.fetch, {
        urls: safeUrls, format, links: true, image_links: true, ttl: 0,
        per_url_timeout_ms: 55_000, purpose,
        ...(fullHtml ? { include_selectors: ["html"] } : {}),
      }) as FetchResponse;
      if (!Array.isArray(result.results)) throw new Error("TinyFish Fetch returned an unreadable response.");
      for (const call of calls) {
        const failure = result.errors?.find((error) => error.url === call.url);
        if (failure || !result.results.some((page) => page.url === call.url)) {
          call.status = "failed";
          call.error = failure?.error ?? "No content returned";
        }
      }
      return result.results.filter((page) => typeof page.text === "string" && !!publicUrl(page.final_url ?? page.url));
    } catch (error) {
      for (const call of calls) { call.status = "failed"; call.error = friendlyError(error); }
      throw error;
    }
  }

  async agent(url: string): Promise<AgentObservation | null> {
    const call: BrandGuide["tinyfish"]["calls"][number] = { endpoint: "agent", url, format: "json", purpose: "Observe rendered logo, colours, type and exact homepage copy", status: "completed" };
    this.calls.push(call);
    try {
      const response = await this.request(ENDPOINTS.agent, {
        url, goal: AGENT_GOAL, browser_profile: "lite",
        // Agent config overrides are account-gated. Omitting the entire block
        // keeps this compatible with standard Agent accounts; the route-level
        // maxDuration and client timeout provide the outer runtime bound.
      }, 295_000) as { status?: string; result?: unknown; resultJson?: unknown };
      if (response.status !== "COMPLETED") throw new Error("Agent observation did not complete; Fetch evidence is retained.");
      const value = response.result ?? response.resultJson;
      const observation = typeof value === "string" ? JSON.parse(value.replace(/^```(?:json)?\s*|\s*```$/g, "")) : value;
      if (!observation || typeof observation !== "object" || Array.isArray(observation)) throw new Error("Agent returned no structured observations.");
      return observation as AgentObservation;
    } catch (error) {
      call.status = "failed";
      call.error = friendlyError(error);
      return null;
    }
  }
}

export function friendlyError(error: unknown): string {
  if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) return "The request timed out or was cancelled. Try again.";
  return error instanceof Error ? error.message : "The request could not be completed. Try again.";
}
