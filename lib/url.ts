import { isIP } from "node:net";

export function publicUrl(value: string, base?: string): string | null {
  try {
    const url = new URL(value, base);
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null;
    if (url.port && !["80", "443"].includes(url.port)) return null;
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || !host.includes(".")) return null;
    if (isIP(host)) {
      if (host.includes(":")) {
        // Only globally routable IPv6 unicast; omit documentation space.
        if (!/^[23][0-9a-f]{3}:/i.test(host) || /^2001:db8:/i.test(host)) return null;
        return url.href;
      }
      const [a, b] = host.split(".").map(Number);
      if (a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)) return null;
    }
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) if (/^utm_|^(?:srsltid|gclid|fbclid)$/i.test(key)) url.searchParams.delete(key);
    return url.href;
  } catch {
    return null;
  }
}

export function normalizeQuery(query: string): { name?: string; url?: string } {
  const value = query.trim();
  if (!value || value.length > 300) throw new Error("Enter a company name or a public website (up to 300 characters).");
  if (/^https?:\/\//i.test(value) || /^[\w-]+(?:\.[\w-]+)+(?:[/:?#].*)?$/.test(value)) {
    const url = publicUrl(/^https?:/i.test(value) ? value : `https://${value}`);
    if (!url) throw new Error("Enter a public HTTP or HTTPS website URL.");
    return { url };
  }
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(value) || value.includes("/")) throw new Error("Enter a company name or a public HTTP or HTTPS website.");
  return { name: value };
}

export function sameSite(candidate: string, homepage: string) {
  try {
    const host = new URL(homepage).hostname.replace(/^www\./, "");
    const other = new URL(candidate).hostname.replace(/^www\./, "");
    return other === host;
  } catch { return false; }
}

export function brandPages(urls: string[], homepage: string): string[] {
  return [...new Set(urls.map((url) => publicUrl(url, homepage)).filter((url): url is string => !!url))]
    .filter((url) => sameSite(url, homepage) && /\/(?:about(?:-us)?|our-(?:story|purpose)|story|stories|company|brand|branding|press|newsroom|media|sustainability)(?:[/?.-]|$)/i.test(new URL(url).pathname))
    .sort((a, b) => new URL(a).pathname.length - new URL(b).pathname.length)
    .slice(0, 3);
}
