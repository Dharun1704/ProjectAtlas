/**
 * Turns Natural Earth's 50m land polygons into one simplified outline.
 *
 *   Input:  data/raw/natural-earth/ne_50m_land.geojson
 *   Output: data/processed/base/land.json
 *
 * Run with:  npm run pipeline:land
 * Deterministic: the same input always gives byte-identical output.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeLand } from "./lib/land.ts";
import type { LandFeature } from "./lib/land.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW_FILE = join(ROOT, "data", "raw", "natural-earth", "ne_50m_land.geojson");
const OUT_DIR = join(ROOT, "data", "processed", "base");

const SIMPLIFY = { tolerance: 0.02, decimals: 2 };

const SOURCE = {
  title: "Natural Earth",
  dataset: "Natural Earth 1:50m land, v5.1.2",
  url: "https://www.naturalearthdata.com",
  license: "Public domain",
};

const raw = JSON.parse(readFileSync(RAW_FILE, "utf8")) as { features: LandFeature[] };
const coordinates = mergeLand(raw.features, SIMPLIFY);

mkdirSync(OUT_DIR, { recursive: true });
const json = JSON.stringify({ source: SOURCE, simplify: SIMPLIFY, geometry: { type: "MultiPolygon", coordinates } });
writeFileSync(join(OUT_DIR, "land.json"), json);

console.log(`features in raw file: ${raw.features.length}`);
console.log(`polygons kept:        ${coordinates.length}`);
console.log(`size:                 ${(json.length / 1e6).toFixed(2)} MB`);
