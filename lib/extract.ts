import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { AgentObservation, BrandGuide, Evidence, FetchPage } from "./schema";
import { publicUrl } from "./url";

const clean = (value: string) => value.replace(/\s+/g, " ").trim();
const pageUrl = (page: FetchPage) => page.final_url ?? page.url;
const evidence = (url: string, detail: string, method: Evidence["method"]): Evidence => ({ url, detail, method });
const strings = (values: unknown): string[] => Array.isArray(values) ? values.filter((value): value is string => typeof value === "string") : [];

export function collectLinks(page: FetchPage): string[] {
  const $ = cheerio.load(page.text);
  return [...(page.links ?? []).map((item) => typeof item === "string" ? item : item.url ?? item.href ?? ""), ...$("a[href]").map((_, el) => $(el).attr("href") ?? "").get()]
    .map((url) => publicUrl(url, pageUrl(page))).filter((url): url is string => !!url);
}

export function collectStylesheets(pages: FetchPage[]): string[] {
  return [...new Set(pages.flatMap((page) => {
    const $ = cheerio.load(page.text);
    return $("link[rel='stylesheet'],link[as='style']").map((_, element) => publicUrl($(element).attr("href") ?? "", pageUrl(page))).get().filter(Boolean);
  }))].sort((a, b) => stylesheetScore(b) - stylesheetScore(a));
}

function stylesheetScore(url: string) {
  const file = new URL(url).pathname.split("/").pop() ?? "";
  return /theme|global|tokens|base|^layout[.-]|main|app[.-]/i.test(file) ? 10 : /header|cta|font/i.test(file) ? 5 : /utils|spacer|icon/i.test(file) ? -5 : 0;
}

export function normalizeHex(value: string): string | null {
  const hex = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i)?.[1];
  if (!hex || (hex.length === 8 && hex.slice(-2).toLowerCase() !== "ff")) return null;
  return `#${(hex.length === 3 ? [...hex].map((char) => char + char).join("") : hex.slice(0, 6)).toUpperCase()}`;
}

function colorValue(value: string): string | null {
  if (/gradient\(|url\(|var\(/i.test(value)) return null;
  const literal = value.match(/#[0-9a-f]{3,8}\b/i)?.[0];
  if (literal) return normalizeHex(literal);
  const rgb = value.match(/^rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i);
  if (rgb && (!rgb[4] || Number(rgb[4]) === 1)) {
    const channels = rgb.slice(1, 4).map(Number);
    if (channels.every((channel) => channel >= 0 && channel <= 255)) return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
  }
  return null;
}

function colourRole(property: string, selector: string) {
  const context = `${property} ${selector}`.toLowerCase();
  if (/background|surface|\bbg\b/.test(context)) return "Background";
  if (/text|foreground|heading|color$/.test(property)) return "Text";
  if (/border|stroke|divider/.test(context)) return "Border";
  if (/error|danger/.test(context)) return "Error state";
  if (/success/.test(context)) return "Success state";
  if (/warning/.test(context)) return "Warning state";
  if (/neutral|gray|grey|black|white|charcoal|midnight/.test(context)) return "Neutral";
  if (/primary|brand|accent|button|cta/.test(context)) return "Accent";
  return property.startsWith("--") ? property.slice(2).replace(/[-_]/g, " ") : "Supporting";
}

function fonts(value: string): string[] {
  if (/var\(/.test(value)) return [];
  const generic = /^(?:serif|sans-serif|monospace|system-ui|inherit|initial|unset|ui-[\w-]+|Arial|Helvetica(?: Neue)?|Times New Roman|cursive|fantasy|BlinkMacSystemFont|SF Pro Display|SFMono-Regular|Segoe UI|Menlo|Monaco|Consolas|Liberation Mono|Courier New|.*Emoji.*|Segoe UI Symbol)$/i;
  value = value.replace(/\s*!important\s*$/, "");
  return value.split(",").map((family) => family.trim().replace(/^["']|["']$/g, ""))
    .filter((family) => family.length > 1 && family.length < 90 && !generic.test(family) && /[a-z]/i.test(family) && !/^[\d.+-]|var\(|[{};]/.test(family)).slice(0, 2);
}

function elementCopy($: cheerio.CheerioAPI, element: AnyNode): string {
  const node = $(element).clone();
  node.find("[aria-hidden='true'], sup, script, style").remove();
  node.find("br").replaceWith(" ");
  return clean(node.text());
}

function isFontProperty(property: string) {
  return property === "font-family" || /^--(?:.*-)?font(?:-family|-sans|-serif|-mono|-heading|-body|-display)?$/i.test(property) || /^--.*font-family(?:-[\w]+)?$/i.test(property);
}

interface ComposeInput {
  query: string;
  homepage: string;
  html: FetchPage[];
  markdown: FetchPage[];
  stylesheets: FetchPage[];
  agent: AgentObservation | null;
  calls: BrandGuide["tinyfish"]["calls"];
  reportId: string;
}

export function composeGuide(input: ComposeInput): BrandGuide {
  const { homepage, markdown, stylesheets, agent } = input;
  const html = [...input.html].sort((a, b) => Number(pageUrl(b) === homepage) - Number(pageUrl(a) === homepage));
  const root = html[0];
  const $home = cheerio.load(root?.text ?? "");
  const activeTheme = $home("html").attr("data-theme");
  const domain = new URL(homepage).hostname.replace(/^www\./, "");
  const siteName = clean($home("meta[property='og:site_name']").attr("content") ?? "");
  const title = clean(root?.title ?? $home("title").text());
  const shortTitle = title.split(/\s[|–—-]\s/)[0];
  const nameQuery = !/[./]/.test(input.query) ? clean(input.query) : "";
  const fallbackName = domain.split(".")[0].replace(/^./, (char) => char.toUpperCase());
  const name = siteName || (shortTitle.length > 0 && shortTitle.length <= 35 ? shortTitle : "") || nameQuery || fallbackName;
  const guide: BrandGuide = {
    reportId: input.reportId, generatedAt: new Date().toISOString(), recorded: false,
    brand: { name, domain, url: homepage, tagline: null },
    logo: [], palette: [], typography: [],
    voice: { attributes: [], do: [], dont: [], quotes: [] },
    messaging: { headline: null, headlineSource: null, description: null, descriptionSource: null, pillars: [], callsToAction: [] },
    sources: [], tinyfish: { endpoints: [...new Set(input.calls.map((call) => call.endpoint))], calls: input.calls },
  };
  const colours: { item: BrandGuide["palette"][number]; score: number }[] = [];
  const addColour = (value: string, property: string, selector: string, url: string, method: Evidence["method"], resolved?: string) => {
    const hex = colorValue(resolved ?? value);
    if (!hex) return;
    const score = (method === "stylesheet" ? 80 : 10) + (property.startsWith("--") ? 35 : 0) + (/root|body|button|h1|html/.test(selector) ? 20 : 0) + (/brand|primary|accent|background|foreground|text|surface/i.test(property) ? 20 : 0) + (/(?:brand|primary).*500$|(?:text|bg|background|foreground|surface)-(?:primary|default)$/.test(property) ? 35 : 0) + (/^(?:body|html|button|h1)(?:\b|[.#])/.test(selector) && /^(?:color|background(?:-color)?)$/.test(property) ? 30 : 0) - (/shadow|gradient|svg|illustration|chart|stage|customerCard/i.test(selector + property) ? 50 : 0) - (/error|danger|warning|success|util-accent|accentColorMode/i.test(property) ? 60 : 0) - (/brandDark/i.test(property) && activeTheme !== "dark" ? 35 : 0);
    colours.push({ item: { hex, role: colourRole(property, selector), source: evidence(url, `${selector || "inline style"} · ${property}: ${clean(value).slice(0, 130)}${resolved && resolved !== value ? ` → ${hex}` : ""}`, method) }, score });
  };
  const addFont = (family: string, role: string, kind: BrandGuide["typography"][number]["kind"], source: Evidence) => {
    const canonical = (value: string) => value.toLowerCase().replace(/[\s-]/g, "");
    if (!guide.typography.some((item) => canonical(item.family) === canonical(family)) && guide.typography.length < 6) guide.typography.push({ family, role, kind, source });
  };
  const parseCss = (css: string, url: string, method: Evidence["method"]) => {
    const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const variables = new Map<string, string>();
    for (const rule of stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const theme = rule[1].match(/\[data-theme\s*=\s*["']?([\w-]+)/)?.[1];
      if (activeTheme && theme && theme !== activeTheme) continue;
      if (/hds-mode--dark/.test(rule[1]) && activeTheme !== "dark") continue;
      if (!/:root|:host|(?:^|,)\s*(?:html|body)\b|\[data-theme/.test(rule[1])) continue;
      for (const declaration of rule[2].matchAll(/(?:^|;)\s*(--[-\w]+)\s*:\s*([^;]+)/g)) variables.set(declaration[1], declaration[2].trim());
    }
    const resolve = (value: string, depth = 0): string => {
      const variable = value.trim().match(/^var\(\s*(--[-\w]+)\s*\)$/)?.[1];
      return variable && variables.has(variable) && depth < 8 ? resolve(variables.get(variable)!, depth + 1) : value;
    };
    for (const rule of stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selector = clean(rule[1]);
      const body = rule[2];
      const theme = selector.match(/\[data-theme\s*=\s*["']?([\w-]+)/)?.[1];
      if (activeTheme && theme && theme !== activeTheme) continue;
      if (/hds-mode--dark/.test(selector) && activeTheme !== "dark") continue;
      for (const declaration of body.matchAll(/(?:^|;)\s*([-\w]+)\s*:\s*([^;]+)/g)) {
        const [, property, value] = declaration;
        if (/color|background|fill|stroke|border|^--/i.test(property)) addColour(value, property, selector.slice(0, 100), url, method, resolve(value));
        if (isFontProperty(property)) {
          const kind = selector.includes("@font-face") ? "font-face" : property.startsWith("--") ? "css-variable" : "css-rule";
          const role = kind === "font-face" ? "Available web font" : /h[1-6]|heading|display|title/i.test(selector + property) ? "Heading" : /mono|code|pre|kbd/i.test(selector + property) ? "Monospace / code" : /serif/.test(property) && !/sans/.test(property) ? "Serif stack" : "Body / interface";
          for (const family of fonts(value)) addFont(family, role, kind, evidence(url, `${selector.slice(0, 80)} · ${property}: ${clean(value).slice(0, 160)}`, method));
        }
      }
    }
  };
  // Stylesheet tokens are ranked ahead of one-off inline art colours.
  for (const sheet of stylesheets) {
    parseCss(sheet.text, pageUrl(sheet), "stylesheet");
    guide.sources.push({ url: pageUrl(sheet), title: "Linked stylesheet", kind: "stylesheet" });
  }
  for (const page of html) {
    const url = pageUrl(page);
    const $ = cheerio.load(page.text);
    guide.sources.push({ url, title: page.title || new URL(url).pathname, kind: url === homepage ? "homepage" : "brand" });
    $("style").each((_, element) => parseCss($(element).text(), url, "html"));
    $("[style]").each((_, element) => parseCss(`${element.tagName}${$(element).attr("class") ? `.${$(element).attr("class")}` : ""}{${$(element).attr("style")}}`, url, "html"));
    const theme = $("meta[name='theme-color']").attr("content");
    if (theme) addColour(theme, "background", "meta[name=theme-color]", url, "html");
    $("link[href*='fonts.googleapis.com']").each((_, element) => {
      const href = $(element).attr("href");
      if (!href) return;
      try {
        for (const font of new URL(href, url).searchParams.getAll("family")) addFont(font.split(":")[0].replace(/\+/g, " "), "Linked web font", "font-file", evidence(url, href, "html"));
      } catch { /* Unparseable font links are not evidence. */ }
    });
    $("link[as='font']").each((_, element) => {
      const href = $(element).attr("href");
      if (!href) return;
      const fontUrl = publicUrl(href, url);
      if (!fontUrl) return;
      const filename = decodeURIComponent(new URL(fontUrl).pathname.split("/").pop() ?? "");
      const identifier = filename.replace(/\.(?:woff2?|ttf|otf)$/i, "").replace(/[.-][a-f\d]{6,}$/i, "");
      if (/^[a-z][a-z -]+$/i.test(identifier)) addFont(identifier, "Preloaded font resource", "font-file", evidence(url, `Font file: ${fontUrl}`, "html"));
    });
    const addLogo = (candidate: string | undefined, role: BrandGuide["logo"][number]["role"], detail: string) => {
      const logoUrl = candidate && publicUrl(candidate, url);
      if (logoUrl && !guide.logo.some((logo) => logo.url === logoUrl) && guide.logo.length < 10) guide.logo.push({ url: logoUrl, role, source: evidence(url, detail, "html") });
    };
    $("img").each((_, element) => {
      const node = $(element);
      const description = `${node.attr("alt") ?? ""} ${node.attr("class") ?? ""} ${node.attr("src") ?? ""}`;
      if (/logo|wordmark/i.test(description) && !/customer|partner|client/i.test(description)) {
        const alt = node.attr("alt") ?? "";
        if (alt.length > 90 || /view of|imitating|forms? .*(?:logo|parallelogram)|shape|display|exterior|overhead/i.test(alt)) return;
        if (alt && !alt.toLowerCase().includes(name.toLowerCase()) && !/^logo$|brand|wordmark/i.test(alt)) return;
        addLogo(node.attr("src") ?? node.attr("data-src"), "primary", `Logo image${alt ? ` · ${alt}` : ""}`);
      }
    });
    $("a[download][href], a[href$='.svg'], a[href$='.png'], svg use[href], svg use[xlink\\:href]").each((_, element) => {
      const href = $(element).attr("href") ?? $(element).attr("xlink:href");
      if (href && /logo|wordmark/i.test(href)) addLogo(href, "primary", "Linked brand mark asset");
    });
    $("link[rel*='icon']").each((_, element) => addLogo($(element).attr("href"), "favicon", `link[rel=${$(element).attr("rel")}]`));
    addLogo($("meta[property='og:image']").attr("content"), "social", "meta[property=og:image]");
    for (const image of page.image_links ?? []) {
      const candidate = typeof image === "string" ? image : image.url ?? image.src;
      if (candidate && /logo|wordmark/i.test(candidate) && !/customer|partner/i.test(candidate)) addLogo(candidate, "primary", "Logo candidate from extracted image links");
    }
    if (!guide.messaging.headline) {
      const heading = $("main h1, h1").first();
      const emphasis = heading.children("em").first();
      guide.messaging.headline = heading[0] ? elementCopy($, emphasis[0] ?? heading[0]) || null : null;
      if (guide.messaging.headline) guide.messaging.headlineSource = evidence(url, "Quoted homepage headline", "html");
    }
    if (!guide.messaging.description && url === homepage) {
      guide.messaging.description = clean($("meta[name='description']").attr("content") ?? page.description ?? $("main p").first().text()) || null;
      if (guide.messaging.description) guide.messaging.descriptionSource = evidence(url, "Homepage meta description or introductory copy", "html");
    }
    $("main h2, article h2, h2").each((_, element) => {
      const text = elementCopy($, element);
      if (text.length >= 12 && text.length <= 180 && !/cookie|sign in|log in|newsletter|privacy|cart|activity/i.test(text) && guide.messaging.pillars.length < 5 && !guide.messaging.pillars.some((pillar) => pillar.text === text)) guide.messaging.pillars.push({ text, source: evidence(url, "Quoted page heading", "html") });
    });
    $("button, a[role='button'], a[class*='button'], a[class*='Button'], a[class*='cta'], a[href*='signup'], a[href*='contact'], a[href*='register']").each((_, element) => {
      const text = elementCopy($, element);
      if (text.toLowerCase() === name.toLowerCase() || /^(?:product|products|resources|solutions|company|developers|more|back)$/i.test(text)) return;
      if ($(element).parents().toArray().some((parent) => /(?:^|[ _-])(?:stage|demo|example|mockup|preview|illustration)(?:[ _-]|$)/i.test($(parent).attr("class") ?? ""))) return;
      if (/^(?:pulse|inbox|my issues|reviews|revert|activity|properties|todo|in progress)$/i.test(text)) return;
      if (text.length > 2 && text.length <= 65 && !/cookie|accept|reject|close|menu|cart/i.test(text) && !guide.messaging.callsToAction.some((cta) => cta.text === text) && guide.messaging.callsToAction.length < 6) guide.messaging.callsToAction.push({ text, source: evidence(url, "Quoted link or button label", "html") });
    });
  }
  const quoteCandidates: { text: string; source: Evidence; score: number }[] = [];
  for (const page of markdown) {
    const url = pageUrl(page);
    if (!guide.sources.some((source) => source.url === url)) guide.sources.push({ url, title: page.title || url, kind: url === homepage ? "homepage" : "brand" });
    for (const raw of page.text.split(/\r?\n/)) {
      const line = raw.trim();
      const text = clean(line.replace(/^#{1,6}\s+/, "").replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\*{1,2}|__/g, ""));
      if (!guide.messaging.headline && /^#\s/.test(line)) { guide.messaging.headline = text; guide.messaging.headlineSource = evidence(url, "Verbatim main heading", "markdown"); }
      if (text.length >= 35 && text.length <= 220 && !/cookie|privacy|copyright|all rights|^\||https?:\/\/|sign in|log in|\b(?:min|minutes) ago\b|spinner|created the issue|added the labels|`/i.test(text)) {
        quoteCandidates.push({ text, source: evidence(url, /^#/.test(line) ? "Verbatim heading" : "Verbatim site copy", "markdown"), score: (/^#{1,2}\s/.test(line) ? 25 : 0) + (url === homepage ? 10 : /\/brand|\/press/.test(url) ? 0 : 15) });
      }
    }
  }
  quoteCandidates.sort((a, b) => b.score - a.score);
  for (const quote of quoteCandidates) {
    if (!guide.voice.quotes.some((item) => item.text === quote.text) && guide.voice.quotes.filter((item) => item.source.url === quote.source.url).length < 3 && guide.voice.quotes.length < 6) guide.voice.quotes.push({ text: quote.text, source: quote.source });
  }
  colours.sort((a, b) => b.score - a.score);
  for (const { item } of colours) if (!guide.palette.some((colour) => colour.hex === item.hex) && guide.palette.filter((colour) => colour.role === item.role).length < 3 && guide.palette.length < 8) guide.palette.push(item);

  if (agent) {
    const agentSource = (detail: string) => evidence(homepage, detail, "agent");
    const logoUrl = typeof agent.logoUrl === "string" ? publicUrl(agent.logoUrl, homepage) : null;
    if (logoUrl && !guide.logo.some((logo) => logo.url === logoUrl)) guide.logo.unshift({ url: logoUrl, role: "primary", source: agentSource("Rendered homepage brand mark") });
    if (Array.isArray(agent.colors)) for (const colour of agent.colors.slice(0, 8)) {
      if (!colour || typeof colour.hex !== "string") continue;
      const hex = normalizeHex(colour.hex);
      // Agent can fill gaps, but never replaces a Fetch-extracted colour.
      if (hex && !guide.palette.some((item) => item.hex === hex) && guide.palette.length < 10) {
        const fetched = colours.find(({ item }) => item.hex === hex)?.item;
        guide.palette.push(fetched ?? { hex, role: typeof colour.role === "string" ? clean(colour.role).slice(0, 80) : "Observed", source: agentSource(typeof colour.location === "string" ? clean(colour.location).slice(0, 200) : "Computed colour on rendered homepage") });
      }
    }
    if (Array.isArray(agent.fonts)) for (const font of agent.fonts.slice(0, 4)) {
      if (font && typeof font.family === "string") for (const family of fonts(font.family)) addFont(family, typeof font.role === "string" ? clean(font.role).slice(0, 80) : "Observed", "rendered-observation", agentSource("Computed font family on rendered homepage"));
    }
    if (!guide.messaging.headline && typeof agent.headline === "string") { guide.messaging.headline = clean(agent.headline).slice(0, 400); guide.messaging.headlineSource = agentSource("Quoted rendered homepage headline"); }
    if (!guide.messaging.callsToAction.length && typeof agent.cta === "string") guide.messaging.callsToAction.push({ text: clean(agent.cta).slice(0, 65), source: agentSource("Quoted rendered primary CTA") });
    for (const text of strings(agent.quotes).slice(0, 3)) if (text.length >= 20 && text.length <= 220 && !guide.voice.quotes.some((quote) => quote.text === text) && guide.voice.quotes.length < 8) guide.voice.quotes.push({ text, source: agentSource("Verbatim line observed on rendered homepage") });
  }
  guide.logo = ["primary", "favicon", "social"].flatMap((role) => guide.logo.filter((logo) => logo.role === role).slice(0, 2));
  guide.brand.tagline = guide.messaging.headline;
  const quotes = guide.voice.quotes;
  const short = quotes.find((quote) => quote.text.split(/\s+/).length <= 18);
  const direct = quotes.find((quote) => /\b(?:you|your)\b/i.test(quote.text));
  const action = quotes.find((quote) => /\b(?:build|create|make|discover|find|start|shop|design|ship)\b/i.test(quote.text));
  if (short) { guide.voice.attributes.push({ name: "Concise", evidence: short.text }); guide.voice.do.push("Keep the short, declarative sentence rhythm found in the quoted copy."); guide.voice.dont.push("Don’t expand a compact source line into a lengthy explanation."); }
  if (direct) { guide.voice.attributes.push({ name: "Direct", evidence: direct.text }); guide.voice.do.push("Address the reader with “you” and “your”, as the source does."); guide.voice.dont.push("Don’t replace direct address with impersonal third-person language."); }
  if (action) { guide.voice.attributes.push({ name: "Action-led", evidence: action.text }); guide.voice.do.push("Lead with concrete action verbs already present in the site copy."); guide.voice.dont.push("Don’t introduce claims or promises absent from the source pages."); }
  guide.sources = [...new Map(guide.sources.map((source) => [source.url, source])).values()];
  return guide;
}
