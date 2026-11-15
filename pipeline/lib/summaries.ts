import { shortenSummary } from "./summary.ts";

export type RawIntros = Record<
  string,
  | { missing: true }
  | { title: string; pageid: number; revision: number; url: string; extract: string; disambiguation?: true }
>;

export type ProcessedSummary = {
  /** Whole sentences from the start of the article's lead. */
  text: string;
  /** True when part of the lead was left out. */
  shortened: boolean;
  /** Title of the Wikipedia article the text comes from. */
  article: string;
  url: string;
  /** Revision of the article the text was taken from. */
  revision: number;
};

/**
 * One summary per polity that the dataset links to an existing article.
 * Polities without a link, or whose article is missing, is a disambiguation
 * page or has an empty lead,
 * get no entry: the app shows them as having no summary.
 * Keys are sorted so the output is deterministic.
 */
export function buildSummaries(
  polities: Record<string, { wikipedia?: string }>,
  intros: RawIntros,
): Record<string, ProcessedSummary> {
  const out: Record<string, ProcessedSummary> = {};
  for (const id of Object.keys(polities).sort()) {
    const requested = polities[id]?.wikipedia;
    const intro = requested ? intros[requested] : undefined;
    // A disambiguation page lists several topics; it says nothing about this polity.
    if (!intro || "missing" in intro || intro.disambiguation) continue;
    const { text, shortened } = shortenSummary(intro.extract);
    if (!text) continue;
    out[id] = { text, shortened, article: intro.title, url: intro.url, revision: intro.revision };
  }
  return out;
}
