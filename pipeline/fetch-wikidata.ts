/**
 * Downloads what the app needs to rank polities as "major": the number of
 * Wikipedia-family pages ("sitelinks") about each polity's Wikidata item.
 *
 * Two lookups, because the border dataset links each polity twice:
 *  1. Wikipedia article title -> the Wikidata item behind that article.
 *  2. Wikidata item (from step 1, and the ids the dataset gives directly) -> sitelink count.
 *
 *   Input:  data/processed/borders/polities.json
 *   Output: data/raw/wikidata/sitelinks.json
 *
 * Run with:  npm run pipeline:fetch-wikidata
 *
 * Not deterministic: Wikidata changes. The deterministic step that follows is
 * build-polity-meta.ts.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getJsonWithRetry, sleep } from "./lib/http.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const POLITIES_FILE = join(ROOT, "data", "processed", "borders", "polities.json");
const OUT_DIR = join(ROOT, "data", "raw", "wikidata");

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const BATCH = 50;
const PAUSE_MS = 1000;

/** The Wikidata item behind a Wikipedia article; null when the article does not exist or has no item. */
type ArticleItem = { item: string; disambiguation?: true } | null;
/** Sitelink count, or null when the item does not exist. */
type Counts = Record<string, number | null>;
type Raw = { fetchedOn: string; articleItems: Record<string, ArticleItem>; sitelinks: Counts };

type WikipediaAnswer = {
  continue?: Record<string, string>;
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages?: { title: string; missing?: boolean; pageprops?: { wikibase_item?: string; disambiguation?: string } }[];
  };
};

type WikidataAnswer = {
  error?: { code: string; id?: string };
  entities?: Record<string, { missing?: string; sitelinks?: Record<string, unknown>; redirects?: { from: string } }>;
};

async function fetchArticleItems(titles: string[]): Promise<Record<string, ArticleItem>> {
  const props = new Map<string, { wikibase_item?: string; disambiguation?: string }>();
  const renamed = new Map<string, string>();
  let cont: Record<string, string> = {};
  for (;;) {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      redirects: "1",
      prop: "pageprops",
      ppprop: "wikibase_item|disambiguation",
      titles: titles.join("|"),
      ...cont,
    });
    const answer = (await getJsonWithRetry(`${WIKIPEDIA_API}?${params}`)) as WikipediaAnswer;
    for (const n of answer.query?.normalized ?? []) renamed.set(n.from, n.to);
    for (const r of answer.query?.redirects ?? []) renamed.set(r.from, r.to);
    for (const page of answer.query?.pages ?? []) {
      if (!page.missing) props.set(page.title, { ...props.get(page.title), ...page.pageprops });
    }
    if (!answer.continue) break;
    cont = answer.continue;
  }

  const out: Record<string, ArticleItem> = {};
  for (const requested of titles) {
    let title = requested;
    for (let hops = 0; hops < 5 && renamed.has(title); hops++) title = renamed.get(title) as string;
    const p = props.get(title);
    out[requested] = p?.wikibase_item
      ? { item: p.wikibase_item, ...(p.disambiguation !== undefined ? { disambiguation: true as const } : {}) }
      : null;
  }
  return out;
}

async function fetchSitelinks(ids: string[]): Promise<Counts> {
  const out: Counts = {};
  let pending = [...ids];
  while (pending.length > 0) {
    const params = new URLSearchParams({
      action: "wbgetentities",
      format: "json",
      props: "sitelinks",
      ids: pending.join("|"),
    });
    const answer = (await getJsonWithRetry(`${WIKIDATA_API}?${params}`)) as WikidataAnswer;

    // One unknown id fails the whole request: record it as missing and ask again without it.
    if (answer.error) {
      const bad = answer.error.code === "no-such-entity" ? answer.error.id : undefined;
      if (!bad || !pending.includes(bad)) throw new Error(`Wikidata API error: ${answer.error.code}`);
      out[bad] = null;
      pending = pending.filter((id) => id !== bad);
      continue;
    }

    for (const [id, entity] of Object.entries(answer.entities ?? {})) {
      // A redirected item comes back under its new id; file it under the id we asked for.
      const requested = entity.redirects?.from ?? id;
      out[requested] = entity.missing !== undefined ? null : Object.keys(entity.sitelinks ?? {}).length;
    }
    for (const id of pending) out[id] ??= null;
    pending = [];
  }
  return out;
}

async function inBatches<T>(
  label: string,
  todo: string[],
  fetchBatch: (batch: string[]) => Promise<Record<string, T>>,
  into: Record<string, T>,
  save: () => void,
): Promise<void> {
  for (let i = 0; i < todo.length; i += BATCH) {
    Object.assign(into, await fetchBatch(todo.slice(i, i + BATCH)));
    save();
    process.stdout.write(`\r${label}: ${Math.min(i + BATCH, todo.length)} / ${todo.length}`);
    await sleep(PAUSE_MS);
  }
  if (todo.length > 0) process.stdout.write("\n");
}

const isItemId = (id: string | undefined): id is string => id !== undefined && /^Q\d+$/.test(id);

const polities = JSON.parse(readFileSync(POLITIES_FILE, "utf8")) as Record<
  string,
  { wikidataId?: string; wikipedia?: string }
>;

mkdirSync(OUT_DIR, { recursive: true });
const outFile = join(OUT_DIR, "sitelinks.json");

// Resume from an earlier, interrupted run.
const previous: Partial<Raw> = existsSync(outFile) ? (JSON.parse(readFileSync(outFile, "utf8")) as Partial<Raw>) : {};
const raw: Raw = {
  fetchedOn: new Date().toISOString().slice(0, 10),
  articleItems: previous.articleItems ?? {},
  sitelinks: previous.sitelinks ?? {},
};
const save = () => writeFileSync(outFile, JSON.stringify(raw, null, 1));

const titles = [...new Set(Object.values(polities).flatMap((p) => (p.wikipedia ? [p.wikipedia] : [])))].sort();
await inBatches("articles", titles.filter((t) => !(t in raw.articleItems)), fetchArticleItems, raw.articleItems, save);

const ids = [
  ...new Set([
    ...Object.values(polities).flatMap((p) => (isItemId(p.wikidataId) ? [p.wikidataId] : [])),
    ...Object.values(raw.articleItems).flatMap((a) => (a && isItemId(a.item) ? [a.item] : [])),
  ]),
].sort();
await inBatches("items", ids.filter((id) => !(id in raw.sitelinks)), fetchSitelinks, raw.sitelinks, save);
save();

console.log(`articles looked up: ${titles.length}`);
console.log(`  with an item:     ${Object.values(raw.articleItems).filter((a) => a !== null).length}`);
console.log(`items looked up:    ${ids.length}`);
console.log(`  not found:        ${ids.filter((id) => raw.sitelinks[id] === null).length}`);
