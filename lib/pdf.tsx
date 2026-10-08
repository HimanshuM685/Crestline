import { Document, Page, Text, View, Link, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { lookup } from "node:dns/promises";
import { publicUrl } from "./url";
import type { BrandGuide } from "./schema";

const styles = StyleSheet.create({
  page: { padding: 42, fontFamily: "Helvetica", fontSize: 10, color: "#182B49", backgroundColor: "#FFFFFF" },
  top: { fontSize: 9, marginBottom: 30, color: "#53647B", letterSpacing: 1 },
  title: { fontSize: 28, fontFamily: "Helvetica-Bold", marginBottom: 20 },
  brand: { fontSize: 54, fontFamily: "Helvetica-Bold", marginTop: 64, marginBottom: 24 },
  tagline: { fontSize: 21, lineHeight: 1.4, marginBottom: 24 },
  domain: { fontSize: 13, color: "#53647B", marginBottom: 70 },
  section: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 10 },
  text: { lineHeight: 1.5, marginBottom: 7 },
  muted: { fontSize: 8, color: "#53647B", lineHeight: 1.4, marginBottom: 8 },
  row: { flexDirection: "row", marginBottom: 9 },
  swatch: { width: 32, height: 32, marginRight: 12 },
  strip: { flexDirection: "row", height: 48, marginBottom: 20 },
  stripColor: { flexGrow: 1 },
  quote: { fontSize: 12, lineHeight: 1.4, marginBottom: 4 },
  footer: { position: "absolute", bottom: 25, left: 42, right: 42, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: "#53647B" },
  logo: { width: 170, height: 64, objectFit: "contain", marginBottom: 14 },
  link: { color: "#324F85", fontSize: 8, marginBottom: 7 },
});

function Footer({ page, recorded }: { page: number; recorded: boolean }) {
  return <View style={styles.footer}><Text>Crestline · {recorded ? "Recorded sample" : "Website evidence"}</Text><Text>{page} / 4</Text></View>;
}

function Report({ guide, logo }: { guide: BrandGuide; logo?: Buffer }) {
  const accent = guide.palette.find((colour) => colour.role.toLowerCase() === "accent")?.hex ?? guide.palette[0]?.hex ?? "#2856D9";
  const primary = guide.logo.find((item) => item.role === "primary");
  return <Document title={`${guide.brand.name} — Brand guide`} author="Crestline" subject="Source-backed brand guide">
    <Page size="A4" style={styles.page} wrap={false}>
      <Text style={styles.top}>CRESTLINE / BRAND GUIDE</Text>
      <View style={{ height: 5, backgroundColor: accent }} />
      <Text style={styles.brand}>{guide.brand.name.slice(0, 60)}</Text>
      <Text style={styles.tagline}>{guide.brand.tagline?.slice(0, 260) || "A guide to the mark and the voice."}</Text>
      <Text style={styles.domain}>{guide.brand.domain}</Text>
      <View style={styles.strip}>{guide.palette.map((item) => <View key={item.hex} style={[styles.stripColor, { backgroundColor: item.hex }]} />)}</View>
      <Text style={styles.muted}>Captured {new Date(guide.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}{guide.recorded ? " · Recorded sample" : ""}</Text>
      <Text style={styles.text}>Visual identity, typography, voice and messaging extracted from public website evidence.</Text>
      <Footer page={1} recorded={guide.recorded} />
    </Page>
    <Page size="A4" style={styles.page} wrap={false}>
      <Text style={styles.top}>{guide.brand.name} / VISUAL IDENTITY</Text>
      <Text style={styles.title}>Mark & colour</Text>
      {/* React PDF Image is not a browser img element. */}
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      {logo ? <Image src={{ data: logo, format: logo[0] === 0x89 ? "png" : "jpg" }} style={styles.logo} /> : null}
      {primary ? <Link src={primary.url} style={styles.link}>{primary.url.slice(0, 180)}</Link> : <Text style={styles.muted}>No primary logo found in the captured evidence.</Text>}
      {guide.logo.slice(0, 3).map((item) => <Text key={item.url} style={styles.muted}>{item.role}: {item.url.slice(0, 130)} · Source: {item.source.url.slice(0, 100)}</Text>)}
      <Text style={styles.section}>Extracted colour candidates</Text>
      {!guide.palette.length && <Text style={styles.muted}>No verified colours found.</Text>}
      {guide.palette.slice(0, 8).map((item) => <View key={item.hex} style={styles.row}>
        <View style={[styles.swatch, { backgroundColor: item.hex }]} />
        <View style={{ flex: 1 }}><Text style={styles.text}>{item.hex} · {item.role}</Text><Text style={styles.muted}>{item.source.method}: {item.source.detail.replace(/→/g, "=>").slice(0, 115)}{`\n`}{item.source.url.slice(0, 115)}</Text></View>
      </View>)}
      <Footer page={2} recorded={guide.recorded} />
    </Page>
    <Page size="A4" style={styles.page} wrap={false}>
      <Text style={styles.top}>{guide.brand.name} / EXPRESSION</Text>
      <Text style={styles.title}>Type & voice</Text>
      {guide.typography.slice(0, 4).map((item) => <View key={item.family}><Text style={styles.section}>{item.family} · {item.role}</Text><Text style={styles.muted}>{item.kind} · {item.source.url.slice(0, 120)}</Text></View>)}
      {!guide.typography.length && <Text style={styles.muted}>No verified font family found.</Text>}
      <Text style={styles.section}>Observed voice</Text>
      <Text style={styles.text}>{guide.voice.attributes.map((attribute) => attribute.name).join(" · ") || "Read the source quotations below."}</Text>
      <Text style={styles.section}>Do</Text>
      {guide.voice.do.slice(0, 3).map((line) => <Text key={line} style={styles.text}>• {line}</Text>)}
      <Text style={styles.section}>Don’t</Text>
      {guide.voice.dont.slice(0, 3).map((line) => <Text key={line} style={styles.text}>• {line}</Text>)}
      <Text style={styles.section}>In their own words</Text>
      {guide.voice.quotes.slice(0, 3).map((quote) => <View key={quote.text}><Text style={styles.quote}>“{quote.text}”</Text><Text style={styles.muted}>{quote.source.url.slice(0, 110)} · {quote.source.method}</Text></View>)}
      <Footer page={3} recorded={guide.recorded} />
    </Page>
    <Page size="A4" style={styles.page} wrap={false}>
      <Text style={styles.top}>{guide.brand.name} / WORDS & EVIDENCE</Text>
      <Text style={styles.title}>Messaging & sources</Text>
      <Text style={styles.section}>Headline</Text><Text style={styles.quote}>{guide.messaging.headline?.slice(0, 280) || "Not found in captured evidence."}</Text>
      {guide.messaging.description && <Text style={styles.text}>{guide.messaging.description.slice(0, 340)}</Text>}
      <Text style={styles.section}>Messaging pillars — quoted headings</Text>
      {guide.messaging.pillars.slice(0, 4).map((item) => <Text key={item.text} style={styles.text}>• {item.text.slice(0, 160)}</Text>)}
      <Text style={styles.section}>Calls to action — observed candidates</Text>
      <Text style={styles.text}>{guide.messaging.callsToAction.map((item) => item.text).join(" · ").slice(0, 260) || "No CTA labels captured."}</Text>
      <Text style={styles.section}>Source pages</Text>
      {guide.sources.filter((source) => source.kind !== "stylesheet").slice(0, 5).map((source) => <Link key={source.url} src={source.url} style={styles.link}>{source.url.slice(0, 140)}</Link>)}
      <Text style={styles.section}>TinyFish endpoint history</Text>
      <Text style={styles.text}>{guide.tinyfish.endpoints.join(" · ")} · {guide.tinyfish.calls.length} evidence calls</Text>
      {guide.tinyfish.calls.filter((call) => call.status === "failed").slice(0, 2).map((call, index) => <Text key={index} style={styles.muted}>{call.endpoint} failed: {call.error?.slice(0, 160)}</Text>)}
      <Text style={styles.muted}>Stylesheet and individual call details are included in the JSON handoff. Voice attributes are local observations based on the quoted corpus; Agent observations are labelled separately.</Text>
      <Footer page={4} recorded={guide.recorded} />
    </Page>
  </Document>;
}

async function rasterLogo(guide: BrandGuide): Promise<Buffer | undefined> {
  const candidate = guide.logo.find((logo) => logo.role === "primary" && /\.(?:png|jpe?g)(?:\?|$)/i.test(logo.url));
  if (!candidate) return;
  let url = publicUrl(candidate.url);
  try {
    // Check every redirect and resolved address before server-side image fetches.
    for (let redirect = 0; url && redirect < 3; redirect++) {
      const addresses = await lookup(new URL(url).hostname, { all: true });
      if (addresses.some(({ address }) => !publicUrl(`https://${address.includes(":") ? `[${address}]` : address}`))) return;
      const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(6_000) });
      if (response.status >= 300 && response.status < 400) { url = publicUrl(response.headers.get("location") ?? "", url); continue; }
      if (!response.ok || !/image\/(png|jpeg)/i.test(response.headers.get("content-type") ?? "") || Number(response.headers.get("content-length")) > 2_000_000) return;
      const reader = response.body?.getReader();
      if (!reader) return;
      const parts: Uint8Array[] = [];
      let length = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > 2_000_000) { await reader.cancel(); return; }
        parts.push(value);
      }
      const buffer = Buffer.concat(parts);
      if (buffer[0] === 0x89 || (buffer[0] === 0xff && buffer[1] === 0xd8)) return buffer;
      return;
    }
  } catch { /* Report uses the source URL when the image cannot be embedded. */ }
}

export async function buildPdf(guide: BrandGuide): Promise<Buffer> {
  const logo = await rasterLogo(guide);
  try { return await renderToBuffer(<Report guide={guide} logo={logo} />); }
  catch (error) {
    if (logo) return renderToBuffer(<Report guide={guide} />);
    throw error;
  }
}
