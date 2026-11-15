import { browserFetchJson, isRecord } from "./fetchJson";
import type { FetchJson } from "./fetchJson";
import type { SourceRef } from "./types";

/** A short summary taken from the lead of a Wikipedia article. */
export type Summary = {
  text: string;
  /** True when part of the lead was left out. */
  shortened: boolean;
  /** Title of the article the text comes from. It is not always the polity's own name. */
  article: string;
  url: string;
};

export type SummarySet = { source: SourceRef; summaries: Record<string, Summary> };

const EMPTY: SummarySet = { source: { title: "Wikipedia" }, summaries: {} };

export function parseSummarySet(json: unknown): SummarySet {
  if (!isRecord(json)) throw new Error("Summary file is not an object");
  const { source, summaries } = json;
  if (!isRecord(source) || typeof source.title !== "string") throw new Error("Summary file has no source");
  if (!isRecord(summaries)) throw new Error("Summary file has no summaries");

  const ref: SourceRef = { title: source.title };
  if (typeof source.url === "string") ref.url = source.url;
  if (typeof source.license === "string") ref.license = source.license;

  const out: Record<string, Summary> = {};
  for (const [id, value] of Object.entries(summaries)) {
    if (
      !isRecord(value) ||
      typeof value.text !== "string" ||
      typeof value.article !== "string" ||
      typeof value.url !== "string" ||
      typeof value.shortened !== "boolean"
    ) {
      throw new Error(`Summary ${id} is malformed`);
    }
    out[id] = { text: value.text, shortened: value.shortened, article: value.article, url: value.url };
  }
  return { source: ref, summaries: out };
}

/** Polity summaries by polity id. Empty when none have been generated. */
export function createSummaryLoader(fetchJson: FetchJson = browserFetchJson): () => Promise<SummarySet> {
  let promise: Promise<SummarySet> | undefined;
  return () => {
    promise ??= fetchJson("summaries/polities.json").then((json) => (json === null ? EMPTY : parseSummarySet(json)));
    promise.catch(() => (promise = undefined)); // let a failed load be retried
    return promise;
  };
}

/** Shared loader for the app. */
export const loadPolitySummaries = createSummaryLoader();
