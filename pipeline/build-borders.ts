/**
 * Turns the raw Cliopatria GeoJSON into per-century border chunks for the app.
 *
 *   Input:  data/raw/cliopatria/extracted/*.geojson  (unzipped from cliopatria.geojson.zip)
 *   Output: data/processed/borders/<chunkStart>.json, polities.json and index.json
 *
 * Run with:  npm run pipeline:borders
 * Deterministic: the same input always gives byte-identical output.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildChunks, buildPolityRecords, isDrawnRow, toSnapshot } from "./lib/cliopatria.ts";
import type { CliopatriaFeature } from "./lib/cliopatria.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW_DIR = join(ROOT, "data", "raw", "cliopatria", "extracted");
const OUT_DIR = join(ROOT, "data", "processed", "borders");

/** Single level of detail for now: about 5 km tolerance, 1 km coordinate precision. */
const SIMPLIFY = { tolerance: 0.05, decimals: 2 };

const SOURCE = {
  title: "Cliopatria",
  dataset: "Cliopatria v0.2.1 (Seshat Global History Databank)",
  url: "https://github.com/Seshat-Global-History-Databank/cliopatria",
  license: "CC BY 4.0",
};

function main(): void {
  const files = readdirSync(RAW_DIR).filter((f) => f.endsWith(".geojson"));
  if (files.length !== 1) {
    throw new Error(`Expected exactly one .geojson in ${RAW_DIR}, found ${files.length}`);
  }
  const rawFile = files[0] as string;
  const raw = JSON.parse(readFileSync(join(RAW_DIR, rawFile), "utf8")) as { features: CliopatriaFeature[] };

  const drawn = raw.features.filter(isDrawnRow);
  let fallbacks = 0;
  const rows = drawn.map((feature) => {
    const row = toSnapshot(feature, SIMPLIFY);
    if (row.usedFallback) fallbacks++;
    return row;
  });
  const chunks = buildChunks(rows);

  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  let totalBytes = 0;
  let largest = { chunkStart: 0, bytes: 0 };
  for (const chunk of chunks) {
    const json = JSON.stringify(chunk);
    writeFileSync(join(OUT_DIR, `${chunk.chunkStart}.json`), json);
    totalBytes += json.length;
    if (json.length > largest.bytes) largest = { chunkStart: chunk.chunkStart, bytes: json.length };
  }

  const index = {
    source: SOURCE,
    rawFile,
    simplify: SIMPLIFY,
    /** Cliopatria gives no per-border confidence, so the app applies this to every border. */
    defaultConfidence: "medium",
    minYear: Math.min(...rows.map((r) => r.snapshot.start)),
    maxYear: Math.max(...rows.map((r) => r.snapshot.end)),
    chunks: chunks.map((c) => c.chunkStart),
  };
  writeFileSync(join(OUT_DIR, "index.json"), JSON.stringify(index, null, 2) + "\n");

  const polities = buildPolityRecords(rows);
  writeFileSync(join(OUT_DIR, "polities.json"), JSON.stringify(polities));

  console.log(`polities:                ${Object.keys(polities).length}`);
  console.log(`rows in raw file:        ${raw.features.length}`);
  console.log(`rows drawn:              ${drawn.length}`);
  console.log(`kept unsimplified:       ${fallbacks} (too small to simplify)`);
  console.log(`chunks written:          ${chunks.length}`);
  console.log(`total size:              ${(totalBytes / 1e6).toFixed(1)} MB`);
  console.log(`largest chunk:           ${largest.chunkStart} (${(largest.bytes / 1e6).toFixed(2)} MB)`);
}

main();
