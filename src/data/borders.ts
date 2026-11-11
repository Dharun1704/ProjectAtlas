import type { MultiPolygon } from "geojson";
import { browserFetchJson, isRecord } from "./fetchJson";
import type { FetchJson } from "./fetchJson";
import type { BorderSnapshot, Confidence, SourceRef } from "./types";

export type { FetchJson };

/**
 * Typed, read-only loader for the border chunks written by
 * /pipeline/build-borders.ts into /data/processed/borders.
 */

export type BorderPolityInfo = { name: string; wikidataId?: string; wikipedia?: string };

export type BorderIndex = {
  source: SourceRef;
  /** Applied to every border: the dataset gives no per-border confidence. */
  defaultConfidence: Confidence;
  minYear: number;
  maxYear: number;
  /** First years of the 100-year chunks that exist. */
  chunks: number[];
};

export type BorderChunk = {
  chunkStart: number;
  polities: Record<string, BorderPolityInfo>;
  snapshots: BorderSnapshot[];
};

/** A polity as the border dataset describes it. */
export type BorderPolityRecord = BorderPolityInfo & {
  /** First and last year the dataset has borders for this polity (astronomical). */
  start: number;
  end: number;
};

export type BorderLoader = {
  /** Null when no border data has been generated. */
  loadIndex: () => Promise<BorderIndex | null>;
  /** Resolves an empty chunk when there is no data for that century. */
  loadChunk: (chunkStart: number) => Promise<BorderChunk>;
  /** Every polity in the border dataset, by id. Empty when nothing has been generated. */
  loadPolities: () => Promise<Record<string, BorderPolityRecord>>;
};

const MAX_CACHED_CHUNKS = 8;

function isConfidence(value: unknown): value is Confidence {
  return value === "high" || value === "medium" || value === "low";
}

export function parseBorderIndex(json: unknown): BorderIndex {
  if (!isRecord(json)) throw new Error("Border index is not an object");
  const { source, defaultConfidence, minYear, maxYear, chunks } = json;
  if (!isRecord(source) || typeof source.title !== "string") throw new Error("Border index has no source");
  if (!isConfidence(defaultConfidence)) throw new Error("Border index has no valid defaultConfidence");
  if (!Number.isInteger(minYear) || !Number.isInteger(maxYear)) throw new Error("Border index has no year range");
  if (!Array.isArray(chunks) || !chunks.every((c) => Number.isInteger(c))) {
    throw new Error("Border index has no chunk list");
  }
  const ref: SourceRef = { title: source.title };
  if (typeof source.url === "string") ref.url = source.url;
  if (typeof source.dataset === "string") ref.dataset = source.dataset;
  if (typeof source.license === "string") ref.license = source.license;
  return {
    source: ref,
    defaultConfidence,
    minYear: minYear as number,
    maxYear: maxYear as number,
    chunks: chunks as number[],
  };
}

export function parseBorderChunk(json: unknown, index: BorderIndex): BorderChunk {
  if (!isRecord(json)) throw new Error("Border chunk is not an object");
  const { chunkStart, polities, snapshots } = json;
  if (!Number.isInteger(chunkStart)) throw new Error("Border chunk has no chunkStart");
  if (!isRecord(polities)) throw new Error("Border chunk has no polities");
  if (!Array.isArray(snapshots)) throw new Error("Border chunk has no snapshots");

  const parsedPolities: Record<string, BorderPolityInfo> = {};
  for (const [id, value] of Object.entries(polities)) {
    if (!isRecord(value) || typeof value.name !== "string") throw new Error(`Polity ${id} has no name`);
    const info: BorderPolityInfo = { name: value.name };
    if (typeof value.wikidataId === "string") info.wikidataId = value.wikidataId;
    if (typeof value.wikipedia === "string") info.wikipedia = value.wikipedia;
    parsedPolities[id] = info;
  }

  const parsedSnapshots = snapshots.map((s: unknown, i): BorderSnapshot => {
    if (!isRecord(s)) throw new Error(`Snapshot ${i} is not an object`);
    const { polityId, start, end, geometry } = s;
    if (typeof polityId !== "string") throw new Error(`Snapshot ${i} has no polityId`);
    if (!Number.isInteger(start) || !Number.isInteger(end)) throw new Error(`Snapshot ${i} has no year range`);
    if ((start as number) > (end as number)) throw new Error(`Snapshot ${i} starts after it ends`);
    if (!isRecord(geometry) || geometry.type !== "MultiPolygon" || !Array.isArray(geometry.coordinates)) {
      throw new Error(`Snapshot ${i} has no MultiPolygon geometry`);
    }
    return {
      polityId,
      start: start as number,
      end: end as number,
      // Checked above as far as is cheap; the pipeline is the only writer of these files.
      geometry: geometry as unknown as MultiPolygon,
      sources: [index.source],
      confidence: index.defaultConfidence,
    };
  });

  return { chunkStart: chunkStart as number, polities: parsedPolities, snapshots: parsedSnapshots };
}

export function parsePolityRecords(json: unknown): Record<string, BorderPolityRecord> {
  if (!isRecord(json)) throw new Error("Polity list is not an object");
  const out: Record<string, BorderPolityRecord> = {};
  for (const [id, value] of Object.entries(json)) {
    if (!isRecord(value) || typeof value.name !== "string") throw new Error(`Polity ${id} has no name`);
    const { start, end } = value;
    if (!Number.isInteger(start) || !Number.isInteger(end)) throw new Error(`Polity ${id} has no year range`);
    const record: BorderPolityRecord = { name: value.name, start: start as number, end: end as number };
    if (typeof value.wikidataId === "string") record.wikidataId = value.wikidataId;
    if (typeof value.wikipedia === "string") record.wikipedia = value.wikipedia;
    out[id] = record;
  }
  return out;
}

export function createBorderLoader(fetchJson: FetchJson): BorderLoader {
  let indexPromise: Promise<BorderIndex | null> | undefined;
  let politiesPromise: Promise<Record<string, BorderPolityRecord>> | undefined;
  // Insertion order doubles as least-recently-used order.
  const cache = new Map<number, Promise<BorderChunk>>();

  const loadIndex = (): Promise<BorderIndex | null> => {
    indexPromise ??= fetchJson("borders/index.json").then((json) => (json === null ? null : parseBorderIndex(json)));
    return indexPromise;
  };

  const fetchChunk = async (chunkStart: number): Promise<BorderChunk> => {
    const empty: BorderChunk = { chunkStart, polities: {}, snapshots: [] };
    const index = await loadIndex();
    if (!index || !index.chunks.includes(chunkStart)) return empty;
    const json = await fetchJson(`borders/${chunkStart}.json`);
    return json === null ? empty : parseBorderChunk(json, index);
  };

  const loadChunk = (chunkStart: number): Promise<BorderChunk> => {
    const cached = cache.get(chunkStart);
    if (cached) {
      cache.delete(chunkStart);
      cache.set(chunkStart, cached);
      return cached;
    }
    const promise = fetchChunk(chunkStart);
    cache.set(chunkStart, promise);
    promise.catch(() => cache.delete(chunkStart)); // let a failed load be retried
    while (cache.size > MAX_CACHED_CHUNKS) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.delete(oldest);
    }
    return promise;
  };

  const loadPolities = (): Promise<Record<string, BorderPolityRecord>> => {
    politiesPromise ??= fetchJson("borders/polities.json").then((json) =>
      json === null ? {} : parsePolityRecords(json),
    );
    return politiesPromise;
  };

  return { loadIndex, loadChunk, loadPolities };
}

/** Shared loader for the app. */
export const borderLoader: BorderLoader = createBorderLoader(browserFetchJson);
