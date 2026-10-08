import { readFile, writeFile } from "node:fs/promises";
import { buildPdf } from "../lib/pdf";
import type { BrandGuide } from "../lib/schema";

// Rebuild an existing snapshot's handoff without claiming a fresh capture.
for (const brand of ["linear", "stripe", "allbirds"]) {
  const jsonUrl = new URL(`../public/demos/${brand}.json`, import.meta.url);
  const guide = JSON.parse(await readFile(jsonUrl, "utf8")) as BrandGuide;
  guide.messaging.headlineSource ??= guide.messaging.headline ? { url: guide.brand.url, detail: "Quoted homepage headline", method: "html" } : null;
  guide.messaging.descriptionSource ??= guide.messaging.description ? { url: guide.brand.url, detail: "Homepage meta description or introductory copy", method: "html" } : null;
  guide.messaging.callsToAction = guide.messaging.callsToAction.filter((cta) => !/^(?:pulse|inbox|my issues|reviews|revert|activity|properties|todo|in progress)$/i.test(cta.text));
  await writeFile(jsonUrl, `${JSON.stringify(guide, null, 2)}\n`);
  await writeFile(new URL(`../public/demos/${brand}.pdf`, import.meta.url), await buildPdf(guide));
}
