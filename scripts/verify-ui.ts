import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import { readEvents } from "../lib/stream";
import type { BrandGuide } from "../lib/schema";

const base = "http://localhost:4321";
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--port", "4321"], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, TINYFISH_API_KEY: "" } });
let serverLog = "";
server.stdout.on("data", (data) => { serverLog += data; });
server.stderr.on("data", (data) => { serverLog += data; });

async function main() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base)).ok) break; } catch { /* Wait for the server. */ }
    if (i === 59) throw new Error(`Server did not start: ${serverLog}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  await mkdir(new URL("../.impeccable/review/", import.meta.url), { recursive: true });
  const browser = await chromium.launch();
  const browserErrors: string[] = [];
  try {
    for (const [name, width, height] of [["desktop", 1440, 1000], ["mobile", 390, 844]] as const) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
      const page = await context.newPage();
      page.on("pageerror", (error) => browserErrors.push(error.message));
      await page.goto(base, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("A website.A brand guide.");
      await expect(page.getByRole("button", { name: "Download PDF" })).toHaveCount(0);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (overflow) throw new Error(`${name} landing overflows horizontally`);
      await page.screenshot({ path: `.impeccable/review/${name}.png`, fullPage: true });
      await page.getByLabel("Company name or website").fill("Example");
      await page.getByRole("button", { name: "Generate guide" }).click();
      await expect(page.locator("#generation-error")).toContainText("Add a TinyFish key");
      await expect(page.getByLabel("TinyFish API key")).toBeVisible();
      await page.getByLabel("TinyFish API key").fill("test-session-only-key");
      expect(await page.evaluate(() => sessionStorage.getItem("crestline-key"))).toBe("test-session-only-key");
      await page.getByRole("button", { name: "Clear", exact: true }).click();
      expect(await page.evaluate(() => sessionStorage.getItem("crestline-key"))).toBeNull();
      await page.getByRole("button", { name: "Dismiss error" }).click();
      await page.getByRole("button", { name: /Linear Product precision/ }).click();
      await expect(page.getByRole("heading", { name: "Linear", exact: true })).toBeVisible();
      await expect(page.getByText("Recorded from public source pages.", { exact: false })).toBeVisible();
      await expect(page.getByText("Rendered observation unavailable.", { exact: false })).toBeVisible();
      await page.locator(".voice-attributes summary").first().click();
      await expect(page.locator(".voice-attributes details[open] p")).toBeVisible();
      await page.locator(".voice-attributes summary").first().click();
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);
      await page.getByRole("button", { name: "Copy #08090A", exact: true }).click();
      await expect(page.getByRole("button", { name: "Reset palette ribbon" })).toBeVisible();
      expect(await page.locator(".report-ribbon span").first().evaluate((element) => getComputedStyle(element).backgroundColor)).toBe("rgb(8, 9, 10)");
      await page.getByRole("button", { name: "Reset palette ribbon" }).click();
      await page.waitForLoadState("networkidle");
      await page.locator(".logo-preview img").evaluateAll(async (images) => {
        await Promise.all(images.map((element) => {
          const image = element as HTMLImageElement;
          image.loading = "eager";
          return image.complete ? Promise.resolve() : new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
            setTimeout(resolve, 12_000);
          });
        }));
      });
      await page.evaluate(() => window.scrollTo(0, 0));
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`${name} guide overflows horizontally`);
      await page.screenshot({ path: `.impeccable/review/${name}-guide.png`, fullPage: true });
      for (const format of ["JSON", "PDF"]) {
        const download = page.waitForEvent("download");
        await page.getByRole("button", { name: `Download ${format}` }).click();
        expect((await download).suggestedFilename()).toBe(`linear-brand-guide.${format.toLowerCase()}`);
      }
      await context.close();
      console.log(`${name}: landing, missing-key recovery, session key, recorded guide and both downloads passed.`);
    }
    if (browserErrors.length) throw new Error(browserErrors.join("\n"));
    if (process.env.TINYFISH_API_KEY) {
      const response = await fetch(`${base}/api/generate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: "linear.app", apiKey: process.env.TINYFISH_API_KEY }) });
      let guide: BrandGuide | undefined;
      await readEvents(response, (event) => {
        if (event.type === "error") throw new Error(event.error);
        if (event.type === "guide") guide = event.guide;
        if (event.type === "progress") console.log(`Live HTTP: ${event.step} — ${event.detail}`);
      });
      if (!guide) throw new Error("Live HTTP did not return a guide");
      for (const format of ["json", "pdf"]) {
        const download = await fetch(`${base}/api/report/${guide.reportId}?format=${format}`);
        expect(download.status).toBe(200);
        expect(download.headers.get("Content-Disposition")).toContain("attachment");
        if (format === "pdf") expect(Buffer.from(await download.arrayBuffer()).subarray(0, 4).toString()).toBe("%PDF");
      }
      expect((await fetch(`${base}/api/report/unknown?format=json`)).status).toBe(404);
      console.log(`Live HTTP report ready: ${guide.palette.length} colours, ${guide.typography.length} fonts. Downloads available immediately. Agent status: ${guide.tinyfish.calls.find((call) => call.endpoint === "agent")?.status}.`);
    }
  } finally { await browser.close(); }
}

main().catch((error: unknown) => { console.error(error); console.error(serverLog); process.exitCode = 1; }).finally(() => { server.kill("SIGTERM"); });
