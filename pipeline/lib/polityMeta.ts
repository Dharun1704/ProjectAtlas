import { multiPolygonArea } from "../../src/layers/geometry.ts";
import type { ProcessedChunk } from "./cliopatria.ts";
import { regionOfShape } from "./regions.ts";
import type { RegionArea } from "./regions.ts";
import type { MultiPolygonCoords } from "./simplify.ts";

export type PolityMeta = {
  /** Wikidata sitelink count of the item this polity is linked to. */
  importance?: number;
  /**
   * Which link the count came from: the Wikidata item behind the polity's
   * Wikipedia article, or the Wikidata id the dataset gives directly.
   */
  importanceFrom?: "article" | "dataset";
  /** True when other polities resolve to the same Wikidata item, so the count is not theirs alone. */
  importanceShared?: true;
  /** Modern region (Natural Earth subregion) holding most of the polity at its largest extent. */
  region?: string;
  continent?: string;
};

export type PolityLinks = { wikidataId?: string; wikipedia?: string };
export type ArticleItems = Record<string, { item: string; disambiguation?: true } | null>;

/** The shape of each polity at its largest mapped extent. */
export function largestShapes(chunks: readonly ProcessedChunk[]): Map<string, MultiPolygonCoords> {
  const best = new Map<string, { area: number; coordinates: MultiPolygonCoords }>();
  for (const chunk of chunks) {
    for (const snapshot of chunk.snapshots) {
      const area = multiPolygonArea(snapshot.geometry.coordinates);
      const known = best.get(snapshot.polityId);
      if (!known || area > known.area) best.set(snapshot.polityId, { area, coordinates: snapshot.geometry.coordinates });
    }
  }
  return new Map([...best].map(([id, v]) => [id, v.coordinates]));
}

/**
 * The Wikidata item whose sitelinks measure a polity's importance.
 *
 * The item behind the linked Wikipedia article is preferred: in Cliopatria the
 * directly given Wikidata id sometimes points at an obscure near-duplicate item
 * (the "Byzantine Empire" id has a single sitelink) while the article title is
 * right. A disambiguation page is not about the polity, so it is skipped.
 */
export function importanceItem(
  links: PolityLinks,
  articleItems: ArticleItems,
  sitelinks: Record<string, number | null>,
): { item: string; from: "article" | "dataset" } | undefined {
  const article = links.wikipedia ? articleItems[links.wikipedia] : undefined;
  if (article && !article.disambiguation && typeof sitelinks[article.item] === "number") {
    return { item: article.item, from: "article" };
  }
  if (links.wikidataId && typeof sitelinks[links.wikidataId] === "number") {
    return { item: links.wikidataId, from: "dataset" };
  }
  return undefined;
}

/**
 * Importance and region for every polity. A field is left out when its source
 * has nothing: no usable link means no importance; a shape wholly off modern
 * land means no region. Keys are sorted for determinism.
 */
export function buildPolityMeta(
  polities: Record<string, PolityLinks>,
  articleItems: ArticleItems,
  sitelinks: Record<string, number | null>,
  shapes: ReadonlyMap<string, MultiPolygonCoords>,
  areas: readonly RegionArea[],
): Record<string, PolityMeta> {
  const ids = Object.keys(polities).sort();
  const chosen = new Map(ids.map((id) => [id, importanceItem(polities[id] as PolityLinks, articleItems, sitelinks)]));
  const usesOfItem = new Map<string, number>();
  for (const c of chosen.values()) {
    if (c) usesOfItem.set(c.item, (usesOfItem.get(c.item) ?? 0) + 1);
  }

  const out: Record<string, PolityMeta> = {};
  for (const id of ids) {
    const meta: PolityMeta = {};
    const c = chosen.get(id);
    if (c) {
      meta.importance = sitelinks[c.item] as number;
      meta.importanceFrom = c.from;
      if ((usesOfItem.get(c.item) ?? 0) > 1) meta.importanceShared = true;
    }
    const shape = shapes.get(id);
    const place = shape ? regionOfShape(shape, areas) : undefined;
    if (place) {
      meta.region = place.region;
      meta.continent = place.continent;
    }
    out[id] = meta;
  }
  return out;
}
