import type { MultiPolygon } from "geojson";
import { browserFetchJson, isRecord } from "./fetchJson";
import type { FetchJson } from "./fetchJson";
import type { SourceRef } from "./types";

/** Modern land outline written by /pipeline/build-land.ts. */
export type LandData = { source: SourceRef; geometry: MultiPolygon };

export function parseLand(json: unknown): LandData {
  if (!isRecord(json)) throw new Error("Land file is not an object");
  const { source, geometry } = json;
  if (!isRecord(source) || typeof source.title !== "string") throw new Error("Land file has no source");
  if (!isRecord(geometry) || geometry.type !== "MultiPolygon" || !Array.isArray(geometry.coordinates)) {
    throw new Error("Land file has no MultiPolygon geometry");
  }
  const ref: SourceRef = { title: source.title };
  if (typeof source.url === "string") ref.url = source.url;
  if (typeof source.dataset === "string") ref.dataset = source.dataset;
  if (typeof source.license === "string") ref.license = source.license;
  // The pipeline is the only writer of this file; coordinates are not re-checked.
  return { source: ref, geometry: geometry as unknown as MultiPolygon };
}

/** Resolves null when the land file has not been generated. */
export async function loadLand(fetchJson: FetchJson = browserFetchJson): Promise<LandData | null> {
  const json = await fetchJson("base/land.json");
  return json === null ? null : parseLand(json);
}
