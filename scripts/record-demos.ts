import { readFile, writeFile } from "node:fs/promises";
import { generateGuide } from "../lib/generate";
import { TinyFish } from "../lib/tinyfish";
import { buildPdf } from "../lib/pdf";

const brands = [
  { id: "linear", query: "linear.app" },
  { id: "stripe", query: "Stripe" },
  { id: "allbirds", query: "Allbirds" },
];

async function main() {
  const key = process.env.TINYFISH_API_KEY;
  if (!key) throw new Error("Set TINYFISH_API_KEY to record the demo set.");
  const requested = process.argv.slice(2);
  const selected = requested.length ? brands.filter((brand) => requested.includes(brand.id)) : brands;
  if (!selected.length) throw new Error("Choose linear, stripe or allbirds.");
  await Promise.all(selected.map(async ({ id, query }) => {
    const guide = await generateGuide(query, new TinyFish(key), (step, detail) => console.log(`[${id}/${step}] ${detail}`));
    guide.recorded = true;
    guide.reportId = `recorded-${id}`;
    const pdf = await buildPdf(guide);
    await writeFile(new URL(`../public/demos/${id}.json`, import.meta.url), `${JSON.stringify(guide, null, 2)}\n`);
    await writeFile(new URL(`../public/demos/${id}.pdf`, import.meta.url), pdf);
    console.log(`[${id}] ${guide.palette.length} colours, ${guide.typography.length} fonts, ${guide.logo.length} marks, ${guide.sources.length} sources. PDF ${pdf.length} bytes.`);
  }));
  const index = await Promise.all(brands.map(async ({ id }) => {
    const guide = JSON.parse(await readFile(new URL(`../public/demos/${id}.json`, import.meta.url), "utf8"));
    return { id, colors: guide.palette.slice(0, 3).map((colour: { hex: string }) => colour.hex) };
  }));
  await writeFile(new URL("../public/demos/index.json", import.meta.url), `${JSON.stringify(index, null, 2)}\n`);
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Demo recording failed."); process.exitCode = 1; });
