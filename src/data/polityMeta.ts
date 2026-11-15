import { browserFetchJson, isRecord } from "./fetchJson";
import type { FetchJson } from "./fetchJson";
import type { SourceRef } from "./types";

/** Ranking and grouping data for a polity, written by /pipeline/build-polity-meta.ts. */
export type PolityMeta = {
  /** Wikidata sitelink count. Missing when the polity has no usable link. */
  importance?: number;
  /** Modern region holding most of the polity at its largest extent. Missing when it is off modern land. */
  region?: string;
  continent?: string;
};

export type PolityMetaSet = {
  sources: { importance?: SourceRef; region?: SourceRef };
  polities: Record<string, PolityMeta>;
};

const EMPTY: PolityMetaSet = { sources: {}, polities: {} };

function parseSource(value: unknown): SourceRef | undefined {
  if (!isRecord(value) || typeof value.title !== "string") return undefined;
  const ref: SourceRef = { title: value.title };
  if (typeof value.url === "string") ref.url = value.url;
  if (typeof value.dataset === "string") ref.dataset = value.dataset;
  if (typeof value.license === "string") ref.license = value.license;
  return ref;
}

export function parsePolityMetaSet(json: unknown): PolityMetaSet {
  if (!isRecord(json)) throw new Error("Polity meta file is not an object");
  const { sources, polities } = json;
  if (!isRecord(polities)) throw new Error("Polity meta file has no polities");

  const out: Record<string, PolityMeta> = {};
  for (const [id, value] of Object.entries(polities)) {
    if (!isRecord(value)) throw new Error(`Polity meta ${id} is malformed`);
    const meta: PolityMeta = {};
    if (typeof value.importance === "number" && Number.isFinite(value.importance)) meta.importance = value.importance;
    if (typeof value.region === "string") meta.region = value.region;
    if (typeof value.continent === "string") meta.continent = value.continent;
    out[id] = meta;
  }

  const parsedSources: PolityMetaSet["sources"] = {};
  if (isRecord(sources)) {
    const importance = parseSource(sources.importance);
    const region = parseSource(sources.region);
    if (importance) parsedSources.importance = importance;
    if (region) parsedSources.region = region;
  }
  return { sources: parsedSources, polities: out };
}

/** Empty when nothing has been generated. */
export function createPolityMetaLoader(fetchJson: FetchJson = browserFetchJson): () => Promise<PolityMetaSet> {
  let promise: Promise<PolityMetaSet> | undefined;
  return () => {
    promise ??= fetchJson("meta/polities.json").then((json) => (json === null ? EMPTY : parsePolityMetaSet(json)));
    promise.catch(() => (promise = undefined)); // let a failed load be retried
    return promise;
  };
}

/** Shared loader for the app. */
export const loadPolityMeta = createPolityMetaLoader();
