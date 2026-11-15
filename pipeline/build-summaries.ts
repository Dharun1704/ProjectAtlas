/**
 * Turns the raw Wikipedia leads into short polity summaries for the app.
 *
 *   Input:  data/raw/wikipedia/intros.json          (from fetch-wikipedia.ts)
 *           data/processed/borders/polities.json
 *   Output: data/processed/summaries/polities.json
 *
 * Run with:  npm run pipeline:summaries
 * Deterministic: the same input always gives byte-identical output.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSummaries } from "./lib/summaries.ts";
import type { RawIntros } from "./lib/summaries.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW_FILE = join(ROOT, "data", "raw", "wikipedia", "intros.json");
const POLITIES_FILE = join(ROOT, "data", "processed", "borders", "polities.json");
const OUT_DIR = join(ROOT, "data", "processed", "summaries");

const raw = JSON.parse(readFileSync(RAW_FILE, "utf8")) as { fetchedOn: string; intros: RawIntros };
const polities = JSON.parse(readFileSync(POLITIES_FILE, "utf8")) as Record<string, { wikipedia?: string }>;

const summaries = buildSummaries(polities, raw.intros);

mkdirSync(OUT_DIR, { recursive: true });
const json = JSON.stringify({
  source: {
    title: "Wikipedia",
    url: "https://en.wikipedia.org",
    license: "CC BY-SA 4.0",
  },
  fetchedOn: raw.fetchedOn,
  summaries,
});
writeFileSync(join(OUT_DIR, "polities.json"), json);

const total = Object.keys(polities).length;
const withSummary = Object.keys(summaries).length;
console.log(`polities:          ${total}`);
console.log(`with a summary:    ${withSummary}`);
console.log(`without a summary: ${total - withSummary}`);
console.log(`size:              ${(json.length / 1e6).toFixed(2)} MB`);
