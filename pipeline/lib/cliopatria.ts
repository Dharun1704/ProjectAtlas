import { chunkStart } from "../../src/time/year.ts";
import { simplifyMultiPolygon } from "./simplify.ts";
import type { MultiPolygonCoords, SimplifyOptions } from "./simplify.ts";
import { cliopatriaYearToAstronomical } from "./years.ts";

/** One row of the Cliopatria GeoJSON, as published. */
export type CliopatriaFeature = {
  type: "Feature";
  properties: {
    Name: string;
    FromYear: number;
    ToYear: number;
    Type: string;
    Wikipedia?: string | null;
    Wikidata?: string | null;
    Components?: string | null;
    MemberOf?: string | null;
  };
  geometry:
    | { type: "Polygon"; coordinates: MultiPolygonCoords[number] }
    | { type: "MultiPolygon"; coordinates: MultiPolygonCoords };
};

/** Polity metadata shipped inside each chunk. */
export type ProcessedPolity = { name: string; wikidataId?: string; wikipedia?: string };

export type ProcessedSnapshot = {
  polityId: string;
  /** Astronomical years, inclusive. */
  start: number;
  end: number;
  geometry: { type: "MultiPolygon"; coordinates: MultiPolygonCoords };
};

export type ProcessedChunk = {
  chunkStart: number;
  polities: Record<string, ProcessedPolity>;
  snapshots: ProcessedSnapshot[];
};

/**
 * Rows drawn as borders: polities that are not themselves made of other rows.
 *
 * Cliopatria has three kinds of row:
 *  - plain polities;
 *  - composite polities, named in parentheses, whose `Components` lists the
 *    polities they group (e.g. "(Warring States China)");
 *  - `RELATION` rows (alliances, personal unions, vassalage) that overlay the
 *    polities they connect.
 * Drawing composites or relations together with their members would paint the
 * same land twice, so only the lowest level is kept. This matches the
 * "Components" view in the dataset authors' own map code.
 */
export function isDrawnRow(feature: CliopatriaFeature): boolean {
  const p = feature.properties;
  return p.Type === "POLITY" && !p.Components;
}

/**
 * Polity ids come from the Cliopatria name, not the Wikidata id: in this
 * dataset one Wikidata id is attached to several different names (for example
 * "Assyria" and "Syria"), so using it as the id would merge distinct polities.
 */
export function polityId(name: string): string {
  return `cliopatria:${name}`;
}

export function toSnapshot(
  feature: CliopatriaFeature,
  options: SimplifyOptions,
): { snapshot: ProcessedSnapshot; polity: ProcessedPolity; usedFallback: boolean } {
  const p = feature.properties;
  const start = cliopatriaYearToAstronomical(p.FromYear);
  const end = cliopatriaYearToAstronomical(p.ToYear);
  if (start > end) throw new Error(`Row "${p.Name}" has FromYear after ToYear`);

  const coords: MultiPolygonCoords =
    feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  const { coordinates, usedFallback } = simplifyMultiPolygon(coords, options);

  const polity: ProcessedPolity = { name: p.Name };
  if (p.Wikidata) polity.wikidataId = p.Wikidata;
  if (p.Wikipedia) polity.wikipedia = p.Wikipedia;

  return {
    snapshot: { polityId: polityId(p.Name), start, end, geometry: { type: "MultiPolygon", coordinates } },
    polity,
    usedFallback,
  };
}

/**
 * Splits snapshots into 100-year chunks. A snapshot is copied into every chunk
 * its range touches, so one chunk is all the app needs for any year inside it.
 * Input order is preserved, which keeps the output deterministic.
 */
export function buildChunks(
  rows: readonly { snapshot: ProcessedSnapshot; polity: ProcessedPolity }[],
): ProcessedChunk[] {
  const chunks = new Map<number, ProcessedChunk>();
  for (const { snapshot, polity } of rows) {
    for (let c = chunkStart(snapshot.start); c <= chunkStart(snapshot.end); c += 100) {
      let chunk = chunks.get(c);
      if (!chunk) {
        chunk = { chunkStart: c, polities: {}, snapshots: [] };
        chunks.set(c, chunk);
      }
      chunk.snapshots.push(snapshot);
      chunk.polities[snapshot.polityId] ??= polity;
    }
  }
  return [...chunks.values()].sort((a, b) => a.chunkStart - b.chunkStart);
}

export type ProcessedPolityRecord = ProcessedPolity & { start: number; end: number };

/**
 * One record per polity, with the first and last year the dataset has borders
 * for it. Keys are sorted so the output is deterministic.
 */
export function buildPolityRecords(
  rows: readonly { snapshot: ProcessedSnapshot; polity: ProcessedPolity }[],
): Record<string, ProcessedPolityRecord> {
  const records = new Map<string, ProcessedPolityRecord>();
  for (const { snapshot, polity } of rows) {
    const existing = records.get(snapshot.polityId);
    if (existing) {
      existing.start = Math.min(existing.start, snapshot.start);
      existing.end = Math.max(existing.end, snapshot.end);
    } else {
      records.set(snapshot.polityId, { ...polity, start: snapshot.start, end: snapshot.end });
    }
  }
  return Object.fromEntries([...records].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}
