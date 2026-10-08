"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowUpRight, Check, ChevronDown, Copy, FileJson, Palette, Shapes, Type, MessageSquare, Quote, Link as LinkIcon } from "lucide-react";
import type { BrandGuide, Evidence } from "@/lib/schema";

export function Source({ source }: { source: Evidence }) {
  return <a className="evidence" href={source.url} target="_blank" rel="noreferrer" title={source.detail}>
    <span className={source.method === "agent" ? "method agent-method" : "method"}>{source.method}</span>
    <span>{source.detail}</span><ArrowUpRight size={12} aria-hidden="true" />
  </a>;
}

function LogoImage({ url, brand }: { url: string; brand: string }) {
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return broken ? <p className="muted">Preview unavailable. Open the original logo below.</p> :
    // External evidence URLs are intentionally not proxied through Next Image.
    // eslint-disable-next-line @next/next/no-img-element
    <><img src={url} alt={`${brand} logo candidate`} loading="lazy" referrerPolicy="no-referrer" style={{ opacity: loaded ? 1 : 0 }} onLoad={() => setLoaded(true)} onError={() => setBroken(true)} />{!loaded && <p className="logo-loading">Loading source image…</p>}</>;
}

const NAV = [
  { id: "mark-colour", label: "Mark & colour", icon: Palette },
  { id: "typography", label: "Typography", icon: Type },
  { id: "voice", label: "Tone of voice", icon: Quote },
  { id: "messaging", label: "Messaging", icon: MessageSquare },
  { id: "sources", label: "Sources & calls", icon: LinkIcon },
];

export default function GuideView({ guide, demo }: { guide: BrandGuide; demo?: string }) {
  const [copied, setCopied] = useState("");
  const [ribbonColour, setRibbonColour] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [downloading, setDownloading] = useState("");
  const agentFailed = guide.tinyfish.calls.some((call) => call.endpoint === "agent" && call.status === "failed");

  async function copy(hex: string) {
    try { await navigator.clipboard.writeText(hex); setCopied(hex); setRibbonColour(hex); setTimeout(() => setCopied(""), 1800); }
    catch { setCopied("Copy unavailable"); }
  }
  async function download(format: "pdf" | "json") {
    setDownloadError(""); setDownloading(format);
    try {
      const url = demo ? `/demos/${demo}.${format}` : `/api/report/${encodeURIComponent(guide.reportId)}?format=${format}`;
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        if (response.status === 404) throw new Error("This report is no longer available. Generate it again to download.");
        throw new Error("The download failed. Please try again.");
      }
      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = blobUrl; link.download = `${guide.brand.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-brand-guide.${format}`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) { setDownloadError(error instanceof Error ? error.message : "The download failed."); }
    finally { setDownloading(""); }
  }

  return <section className="guide" aria-labelledby="guide-title">
    <div className="guide-bar">
      <div><span className="ready-dot" />{guide.recorded ? "Recorded sample" : "Your guide is ready"}<span className="guide-date">{new Date(guide.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</span></div>
      <div className="downloads">
        <button className="button button-light" onClick={() => download("json")} disabled={!!downloading}><FileJson size={16} />{downloading === "json" ? "Downloading…" : "Download JSON"}</button>
        <button className="button button-ink" onClick={() => download("pdf")} disabled={!!downloading}><ArrowDownToLine size={16} />{downloading === "pdf" ? "Downloading…" : "Download PDF"}</button>
      </div>
    </div>
    {agentFailed && <p className="evidence-status">Rendered observation unavailable. This guide uses collected Fetch evidence.</p>}
    {downloadError && <p className="error download-error" role="alert">{downloadError}</p>}
    <div className="report-ribbon" aria-label={ribbonColour ? `Copied colour ${ribbonColour}` : "Extracted colour palette"}>{guide.palette.map((colour) => <span key={colour.hex} style={{ backgroundColor: ribbonColour || colour.hex }} />)}</div>
    <div className="report-layout">
      <aside className="report-sidebar"><p>IN THIS GUIDE</p><nav aria-label="Guide sections">{NAV.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`}><Icon size={16} />{label}</a>)}</nav><div className="handoff-note"><Shapes size={23} /><span>The mark.<br />The voice.<br />Ready to hand over.</span></div></aside>
      <article className="report-body">
        <header className="report-header">
          <h2 id="guide-title">{guide.brand.name}</h2>
          <a href={guide.brand.url} className="domain-link" target="_blank" rel="noreferrer">{guide.brand.domain}<ArrowUpRight size={15} /></a>
          <p className="brand-tagline">{guide.brand.tagline || "The visual and verbal identity, gathered from the source."}</p>
          {guide.messaging.headlineSource && <Source source={guide.messaging.headlineSource} />}
          {guide.recorded && <p className="sample-note">Recorded from public source pages. This sample is a snapshot, not a live run.</p>}
        </header>

        <section className="report-section" id="mark-colour">
          <div className="section-heading"><h3>Mark & colour</h3><span>Visual identity</span></div>
          {guide.logo.length ? <div className="logo-candidates">{guide.logo.map((logo, index) => <figure className={`logo-candidate ${logo.role}`} key={logo.url}>
            <div className="logo-preview"><LogoImage key={logo.url} url={logo.url} brand={guide.brand.name} /></div>
            <figcaption><div className="candidate-label"><strong>{logo.role === "primary" ? `Primary candidate${index ? ` ${index + 1}` : ""}` : logo.role === "favicon" ? "Favicon" : "Social image"}</strong><a href={logo.url} target="_blank" rel="noreferrer" aria-label={`Open ${logo.role} image`}><ArrowUpRight size={16} /></a></div><Source source={logo.source} /></figcaption>
          </figure>)}</div> : <p className="empty-evidence">No logo URL was found in the captured evidence.</p>}
          <h4 className="subheading">Colour palette <span>{ribbonColour ? <button className="reset-ribbon" onClick={() => setRibbonColour("")}>Reset palette ribbon</button> : "Click a swatch to copy its hex."}</span></h4>
          <p className="annotation palette-note">Extracted colour candidates. Roles describe CSS tokens and page elements.</p>
          {guide.palette.length ? <div className="swatches">{guide.palette.map((colour) => <div className="swatch" key={colour.hex}>
            <button style={{ backgroundColor: colour.hex }} onClick={() => copy(colour.hex)} aria-label={`Copy ${colour.hex}`}><span className="swatch-copy">{copied === colour.hex ? <Check size={16} /> : <Copy size={16} />}</span></button>
            <div className="swatch-label"><strong>{colour.hex}</strong><span>{colour.role}</span></div><Source source={colour.source} />
          </div>)}</div> : <p className="empty-evidence">No verified hex values were returned. Colours have not been guessed.</p>}
          <span className="sr-only" role="status">{copied ? copied === "Copy unavailable" ? copied : `${copied} copied` : ""}</span>
        </section>

        <section className="report-section" id="typography">
          <div className="section-heading"><h3>Typography</h3><span>Letterforms & roles</span></div>
          {guide.typography.length ? <div className="type-list">{guide.typography.map((font) => <div className="type-row" key={font.family}><div className="type-specimen" aria-hidden="true">Aa</div><div><h4>{font.family}</h4><p>{font.role} <span className="type-kind">{font.kind.replace(/-/g, " ")}</span></p><Source source={font.source} /></div></div>)}</div> : <p className="empty-evidence">No font family could be verified in this capture.</p>}
          <p className="annotation">Font names are extracted evidence. Specimens use Crestline’s interface font; source fonts are not loaded.</p>
        </section>

        <section className="report-section" id="voice">
          <div className="section-heading"><h3>Tone of voice</h3><span>How the brand speaks</span></div>
          {guide.voice.attributes.length > 0 && <div className="voice-attributes">{guide.voice.attributes.map((attribute) => <details key={attribute.name}><summary>{attribute.name}<ChevronDown size={12} /></summary><div><p>“{attribute.evidence}”</p>{guide.voice.quotes.find((quote) => quote.text === attribute.evidence) && <Source source={guide.voice.quotes.find((quote) => quote.text === attribute.evidence)!.source} />}</div></details>)}</div>}
          <p className="annotation">Attributes and guidance describe patterns in the captured copy.</p>
          {(guide.voice.do.length > 0 || guide.voice.dont.length > 0) && <div className="voice-guidance"><div><h4><Check size={16} />Do</h4><ul>{guide.voice.do.map((line) => <li key={line}>{line}</li>)}</ul></div><div><h4>Don’t</h4><ul>{guide.voice.dont.map((line) => <li key={line}>{line}</li>)}</ul></div></div>}
          <h4 className="subheading">In their own words</h4>
          {guide.voice.quotes.length ? <div className="quote-list">{guide.voice.quotes.map((quote) => <blockquote key={quote.text}><p>“{quote.text}”</p><Source source={quote.source} /></blockquote>)}</div> : <p className="empty-evidence">No short source quotations were captured.</p>}
        </section>

        <section className="report-section" id="messaging">
          <div className="section-heading"><h3>Key messaging</h3><span>What the brand says</span></div>
          <div className="messaging-lead"><h4>Homepage headline</h4><p>{guide.messaging.headline || "No headline found."}</p>{guide.messaging.headlineSource && <Source source={guide.messaging.headlineSource} />}{guide.messaging.description && <div className="messaging-description">{guide.messaging.description}{guide.messaging.descriptionSource && <Source source={guide.messaging.descriptionSource} />}</div>}</div>
          <h4 className="subheading">Pillars <span>Quoted page headings</span></h4>
          {guide.messaging.pillars.length ? <ul className="pillar-list">{guide.messaging.pillars.map((pillar) => <li key={pillar.text}><p>{pillar.text}</p><Source source={pillar.source} /></li>)}</ul> : <p className="empty-evidence">No messaging headings captured.</p>}
          <h4 className="subheading">Calls to action <span>Observed CTA candidates</span></h4>
          {guide.messaging.callsToAction.length ? <div className="cta-list">{guide.messaging.callsToAction.map((cta) => <div key={cta.text}><span className="quoted-cta">{cta.text}<ArrowUpRight size={14} /></span><Source source={cta.source} /></div>)}</div> : <p className="empty-evidence">No button or CTA labels found.</p>}
        </section>

        <section className="report-section" id="sources">
          <div className="section-heading"><h3>Sources & calls</h3><span>Follow the evidence</span></div>
          <ul className="source-list">{guide.sources.map((source) => <li key={source.url}><span className="source-kind">{source.kind}</span><a href={source.url} target="_blank" rel="noreferrer"><span><strong>{source.kind === "stylesheet" ? new URL(source.url).pathname.split("/").pop() : source.title}</strong><span className="source-url">{source.url}</span></span><ArrowUpRight size={14} /></a></li>)}</ul>
          <div className="endpoint-summary"><span>TinyFish endpoints attempted</span><div>{guide.tinyfish.endpoints.map((endpoint) => {
            const calls = guide.tinyfish.calls.filter((call) => call.endpoint === endpoint);
            const failed = calls.some((call) => call.status === "failed");
            const status = failed ? calls.some((call) => call.status === "completed") ? "partial" : "failed" : "completed";
            return <span key={endpoint} className={`endpoint endpoint-${status}`}>{endpoint} · {status}</span>;
          })}</div></div>
          <details className="call-history"><summary>Inspect {guide.tinyfish.calls.length} evidence calls</summary><ul>{guide.tinyfish.calls.map((call, index) => <li key={index}><div><strong>{call.endpoint}</strong><span>{call.format}</span><span className={`call-status ${call.status}`}>{call.status}</span></div><p>{call.purpose}</p><a href={call.url} target="_blank" rel="noreferrer">{call.url}</a>{call.error && <p className="call-error">{call.error}</p>}</li>)}</ul></details>
        </section>
        <footer className="report-footer"><span>Prepared with Crestline</span><span>Evidence in. Identity out.</span></footer>
      </article>
    </div>
  </section>;
}
