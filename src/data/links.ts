/** Builds outbound links from identifiers given by a dataset. */

/** Link to an English Wikipedia article from its page title. */
export function wikipediaUrl(pageTitle: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle.trim().replace(/ /g, "_"))}`;
}

/** Link to a Wikidata item, or null when the id is not a well-formed item id. */
export function wikidataUrl(id: string): string | null {
  return /^Q\d+$/.test(id) ? `https://www.wikidata.org/wiki/${id}` : null;
}
