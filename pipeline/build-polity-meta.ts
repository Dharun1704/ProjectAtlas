/**
 * Works out, for every polity, how "major" it is and which modern region it sits in.
 *
 *   Input:  data/processed/borders/*.json                        (from build-borders.ts)
 *           data/raw/wikidata/sitelinks.json                     (from fetch-wikidata.ts)
 *           data/raw/natural-earth/ne_50m_admin_0_countries.geojson
 *   Output: data/processed/meta/polities.json
 *
 * Run with:  npm run pipeline:polity-meta
 * Deterministic: the same input always gives byte-identical output.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ProcessedChunk } from "./lib/cliopatria.ts";
import { buildPolityMeta, largestShapes } from "./lib/polityMeta.ts";
import type { ArticleItems, PolityLinks } from "./lib/polityMeta.ts";
import { toRegionAreas } from "./lib/regions.ts";
import type { CountryFeature } from "./lib/regions.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BORDERS_DIR = join(ROOT, "data", "processed", "borders");
const SITELINKS_FILE = join(ROOT, "data", "raw", "wikidata", "sitelinks.json");
const COUNTRIES_FILE = join(ROOT, "data", "raw", "natural-earth", "ne_50m_admin_0_countries.geojson");
const OUT_DIR = join(ROOT, "data", "processed", "meta");

const readJson = <T>(file: string): T => JSON.parse(readFileSync(file, "utf8")) as T;

const index = readJson<{ chunks: number[] }>(join(BORDERS_DIR, "index.json"));
const chunks = index.chunks.map((c) => readJson<ProcessedChunk>(join(BORDERS_DIR, `${c}.json`)));
const polities = readJson<Record<string, PolityLinks>>(join(BORDERS_DIR, "polities.json"));
const wikidata = readJson<{ fetchedOn: string; articleItems: ArticleItems; sitelinks: Record<string, number | null> }>(
  SITELINKS_FILE,
);
const countries = readJson<{ features: CountryFeature[] }>(COUNTRIES_FILE);

const meta = buildPolityMeta(
  polities,
  wikidata.articleItems,
  wikidata.sitelinks,
  largestShapes(chunks),
  toRegionAreas(countries.features),
);

mkdirSync(OUT_DIR, { recursive: true });
const json = JSON.stringify({
  sources: {
    importance: {
      title: "Wikidata",
      dataset: "Wikidata sitelink counts",
      url: "https://www.wikidata.org",
      license: "CC0",
    },
    region: {
      title: "Natural Earth",
      dataset: "Natural Earth 1:50m countries, v5.1.2",
      url: "https://www.naturalearthdata.com",
      license: "Public domain",
    },
  },
  importanceFetchedOn: wikidata.fetchedOn,
  polities: meta,
});
writeFileSync(join(OUT_DIR, "polities.json"), json);

const all = Object.values(meta);
console.log(`polities:            ${all.length}`);
console.log(`with importance:     ${all.filter((m) => m.importance !== undefined).length}`);
console.log(`  from the article:  ${all.filter((m) => m.importanceFrom === "article").length}`);
console.log(`  from the dataset:  ${all.filter((m) => m.importanceFrom === "dataset").length}`);
console.log(`  shared item:       ${all.filter((m) => m.importanceShared).length}`);
console.log(`with a region:       ${all.filter((m) => m.region).length}`);
console.log(`size:                ${(json.length / 1e6).toFixed(2)} MB`);
