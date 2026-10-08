"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, FileText, Globe2, KeyRound, LoaderCircle, X } from "lucide-react";
import type { BrandGuide, Step } from "@/lib/schema";
import { readEvents } from "@/lib/stream";
import GuideView from "./guide-view";
import demoIndex from "@/public/demos/index.json";

const DEMOS = [
  { id: "linear", name: "Linear", domain: "linear.app", detail: "Product precision" },
  { id: "stripe", name: "Stripe", domain: "stripe.com", detail: "A confident product voice" },
  { id: "allbirds", name: "Allbirds", domain: "allbirds.com", detail: "A story-led consumer brand" },
].map((brand) => ({ ...brand, colors: demoIndex.find((sample) => sample.id === brand.id)?.colors ?? [] }));
const STEPS: { id: Step; label: string }[] = [{ id: "resolve", label: "Resolve" }, { id: "search", label: "Search" }, { id: "fetch", label: "Fetch" }, { id: "agent", label: "Agent" }, { id: "compose", label: "Compose" }];

function Crest({ className = "" }: { className?: string }) {
  return <svg className={className} width="29" height="29" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M5 8.5 11 4l5 4.5L21 4l6 4.5v10L16 28 5 18.5v-10Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="m8 18 8-7 8 7M9 22h14" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>;
}

export default function Workspace({ hasServerKey }: { hasServerKey: boolean }) {
  const [query, setQuery] = useState("");
  const [guide, setGuide] = useState<BrandGuide | null>(null);
  const [demo, setDemo] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>("resolve");
  const [detail, setDetail] = useState("");
  const [visited, setVisited] = useState<Step[]>([]);
  const [keyNotice, setKeyNotice] = useState("");
  const keyInput = useRef<HTMLInputElement>(null);
  const keyDetails = useRef<HTMLDetailsElement>(null);
  const queryInput = useRef<HTMLInputElement>(null);
  const report = useRef<HTMLDivElement>(null);
  const active = useRef<AbortController | null>(null);

  useEffect(() => {
    try { if (keyInput.current) keyInput.current.value = sessionStorage.getItem("crestline-key") ?? ""; } catch { /* Browser storage can be unavailable. */ }
    return () => active.current?.abort();
  }, []);

  async function generate(value: string) {
    if (busy || loadingDemo) return;
    if (!value.trim()) { setError("Enter a company name or website to get started."); queryInput.current?.focus(); return; }
    const controller = new AbortController(); active.current = controller;
    setQuery(value); setError(""); setGuide(null); setDemo(undefined); setBusy(true);
    setStep("resolve"); setVisited([]); setDetail("Connecting to TinyFish…");
    try {
      const response = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: value.trim(), apiKey: keyInput.current?.value.trim() || undefined }), signal: controller.signal,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        if (!hasServerKey && !keyInput.current?.value && keyDetails.current) keyDetails.current.open = true;
        throw new Error(body.error || "Couldn’t start generation. Please try again.");
      }
      await readEvents(response, (event) => {
        if (event.type === "progress") { setStep(event.step); setDetail(event.detail); setVisited((previous) => previous.includes(event.step) ? previous : [...previous, event.step]); }
        else if (event.type === "error") throw new Error(event.error);
        else { setGuide(event.guide); setTimeout(() => report.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }), 100); }
      });
    } catch (issue) { if (!controller.signal.aborted) setError(issue instanceof Error ? issue.message : "Generation failed. Try again."); }
    finally { if (active.current === controller) { setBusy(false); active.current = null; } }
  }

  async function loadDemo(id: string) {
    if (busy || loadingDemo) return;
    const controller = new AbortController(); active.current = controller;
    setLoadingDemo(id); setError("");
    try {
      const response = await fetch(`/demos/${id}.json`, { signal: controller.signal });
      if (!response.ok) throw new Error("The recorded sample couldn’t be loaded. Please try again.");
      const sample = await response.json() as BrandGuide;
      setGuide(sample); setDemo(id);
      setTimeout(() => report.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }), 100);
    } catch (issue) { if (!controller.signal.aborted) setError(issue instanceof Error ? issue.message : "The sample could not be loaded."); }
    finally { setLoadingDemo(""); if (active.current === controller) active.current = null; }
  }

  function saveKey(value: string) {
    try { if (value) sessionStorage.setItem("crestline-key", value); else sessionStorage.removeItem("crestline-key"); setKeyNotice(""); }
    catch { setKeyNotice("Browser storage is unavailable. The key will work for this page only."); }
  }

  return <>
    <a className="skip-link" href="#query">Skip to generator</a>
    <header className="masthead"><div className="masthead-inner"><Link href="/" className="wordmark" aria-label="Crestline home"><Crest />Crestline<span className="wordmark-period">.</span></Link><div className="masthead-right"><span>A crest is the mark. A line is the voice.</span><a href="#recorded">Explore samples<ArrowUpRight size={15} /></a></div></div></header>
    <main className="workspace">
      <section className="intro" aria-labelledby="page-title">
        <div className="intro-copy"><h1 id="page-title">A website.<br />A brand guide.</h1><p>Find the mark, the colours, the type, and the voice.<br className="desktop-break" /> One sourced guide, ready for your next handoff.</p></div>
        <div className="identity-specimen" aria-hidden="true"><div className="specimen-title"><Crest /><span>THE MARK & THE VOICE</span></div><div className="specimen-type">Aa<span>Aa</span></div><div className="specimen-swatches"><span /><span /><span /><span /></div><div className="specimen-foot"><span>Brand guide</span><span>PDF + JSON<ArrowUpRight size={12} /></span></div></div>
      </section>

      <section className="generator" aria-label="Generate a brand guide">
        <form onSubmit={(event) => { event.preventDefault(); generate(query); }}>
          <label htmlFor="query">Company name or website</label>
          <div className="input-row"><Globe2 size={22} className="input-icon" aria-hidden="true" /><input ref={queryInput} id="query" name="query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. linear.app or Allbirds" maxLength={300} autoComplete="off" autoCapitalize="off" spellCheck={false} disabled={busy || !!loadingDemo} aria-describedby={error ? "generation-error" : "input-hint"} /><button className="button button-primary" type="submit" disabled={busy || !!loadingDemo}>{busy ? <LoaderCircle size={18} className="spin" /> : null}{busy ? "Generating" : "Generate guide"}{!busy && <ArrowRight size={18} />}</button></div>
          <div className="input-bottom"><div className="live-examples"><span id="input-hint">Try a live run</span>{DEMOS.map((brand) => <button key={brand.id} type="button" disabled={busy || !!loadingDemo} onClick={() => generate(brand.domain)}>{brand.name}<ArrowUpRight size={12} /></button>)}</div><span className="no-account">No account. Just a handoff.</span></div>
        </form>
        <details className="session-key" ref={keyDetails}><summary><KeyRound size={14} /><span>Session key</span><span className="optional-label">{hasServerKey ? "Optional · server key available" : "Required for live generation"}</span><ChevronDown size={14} className="key-chevron" /></summary><div className="key-content"><label htmlFor="api-key">TinyFish API key</label><div className="key-input-row"><input ref={keyInput} id="api-key" type="password" autoComplete="off" spellCheck={false} placeholder={hasServerKey ? "Leave empty to use the server key" : "Paste your TinyFish key"} onChange={(event) => saveKey(event.target.value)} disabled={busy} /><button type="button" disabled={busy} onClick={() => { if (keyInput.current) keyInput.current.value = ""; saveKey(""); }}>Clear</button></div><p>Kept in this tab’s session and sent only with your generate request.{!hasServerKey && <> You can also <a href="https://agent.tinyfish.ai/api-keys" target="_blank" rel="noreferrer">get a TinyFish key<ArrowUpRight size={11} /></a> or open a sample below.</>}</p>{keyNotice && <p role="status">{keyNotice}</p>}</div></details>
        {error && <div className="error" id="generation-error" role="alert"><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Dismiss error"><X size={17} /></button></div>}
        {busy && <div className="progress-panel"><div className="progress-header"><div><LoaderCircle className="spin" size={17} /><p role="status" aria-live="polite">{detail}</p></div><button type="button" onClick={() => { active.current?.abort(); setBusy(false); active.current = null; }}>Cancel</button></div><ol className="steps">{STEPS.map(({ id, label }) => <li key={id} className={step === id ? "current" : visited.includes(id) ? "done" : ""}><span>{visited.includes(id) && step !== id ? <Check size={12} /> : <span className="step-dot" />}</span>{label}</li>)}</ol><p className="progress-note">Live pages can take a minute or two. Your downloads will be ready with the guide.</p></div>}
      </section>

      <section id="recorded" className="recorded" aria-labelledby="recorded-title"><div className="recorded-heading"><h2 id="recorded-title">Recorded reports</h2><p>A look at the output. No key needed.</p><span className="sample-badge">Samples</span></div><div className="demo-grid">{DEMOS.map((brand) => <button className="demo-button" type="button" key={brand.id} disabled={busy || !!loadingDemo} onClick={() => loadDemo(brand.id)}><div className="demo-swatches" aria-hidden="true">{brand.colors.map((hex) => <span key={hex} style={{ backgroundColor: hex }} />)}</div><div className="demo-info"><strong>{brand.name}</strong><span>{brand.detail}</span></div>{loadingDemo === brand.id ? <LoaderCircle size={19} className="spin" /> : <ArrowRight size={20} />}</button>)}</div></section>

      <div ref={report} className="report-anchor">{guide ? <GuideView key={guide.reportId} guide={guide} demo={demo} /> : !busy && <section className="what-you-get" aria-label="Guide contents"><div><FileText size={20} /><h2>The essentials, together.</h2></div><p>Logo candidates · Colour palette · Typography · Tone of voice · Messaging · Sources</p><span>Generate once. Download as a four-page PDF or structured JSON.</span></section>}</div>
      <footer className="site-footer"><div className="footer-brand"><Crest />Crestline<span>Evidence in. Identity out.</span></div><p>Powered by TinyFish<span className="footer-endpoints">Search · Fetch · Agent</span></p></footer>
    </main>
  </>;
}
