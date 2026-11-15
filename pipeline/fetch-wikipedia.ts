/**
 * Downloads the lead section of each Wikipedia article that the border dataset
 * links a polity to, and saves the raw answers.
 *
 *   Input:  data/processed/borders/polities.json  (article titles from Cliopatria)
 *   Output: data/raw/wikipedia/intros.json
 *
 * Run with:  npm run pipeline:fetch-wikipedia
 *
 * This is the one pipeline step that is NOT deterministic: Wikipedia changes.
 * Each answer records the article revision it came from. The deterministic
 * step that follows is build-summaries.ts.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const POLITIES_FILE = join(ROOT, "data", "processed", "borders", "polities.json");
const OUT_DIR = join(ROOT, "data", "raw", "wikipedia");

const API = "https://en.wikipedia.org/w/api.php";
/** The API returns at most 20 lead extracts per request. */
const BATCH = 20;
const PAUSE_MS = 1000;
const MAX_RETRIES = 6;

type Page = {
  title: string;
  missing?: boolean;
  pageid?: number;
  lastrevid?: number;
  canonicalurl?: string;
  extract?: string;
  /** Present (as an empty string) on disambiguation pages. */
  pageprops?: { disambiguation?: string };
};

type ApiAnswer = {
  continue?: Record<string, string>;
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages?: Page[];
  };
};

export type RawIntro =
  | { missing: true }
  | { title: string; pageid: number; revision: number; url: string; extract: string; disambiguation?: true };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fetches one API page, backing off when Wikipedia asks us to slow down. */
async function getWithRetry(url: string): Promise<ApiAnswer> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, {
      headers: { "User-Agent": "HistoryAtlasPipeline/0.1 (offline data pipeline)" },
    });
    if (response.ok) return (await response.json()) as ApiAnswer;
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt >= MAX_RETRIES) throw new Error(`Wikipedia API answered ${response.status}`);
    const retryAfter = Number(response.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 5000 * 2 ** attempt;
    process.stdout.write(`\n  asked to slow down (${response.status}); waiting ${Math.round(waitMs / 1000)}s\n`);
    await sleep(waitMs);
  }
}

async function fetchBatch(titles: string[]): Promise<Record<string, RawIntro>> {
  const pages = new Map<string, Page>();
  const renamed = new Map<string, string>(); // requested or intermediate title -> next title
  let cont: Record<string, string> = {};

  for (;;) {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      redirects: "1",
      prop: "extracts|info|pageprops",
      ppprop: "disambiguation",
      exintro: "1",
      explaintext: "1",
      exlimit: "max",
      inprop: "url",
      titles: titles.join("|"),
      ...cont,
    });
    const answer = await getWithRetry(`${API}?${params}`);

    for (const n of answer.query?.normalized ?? []) renamed.set(n.from, n.to);
    for (const r of answer.query?.redirects ?? []) renamed.set(r.from, r.to);
    for (const page of answer.query?.pages ?? []) {
      const known = pages.get(page.title);
      pages.set(page.title, {
        ...known,
        ...page,
        extract: page.extract ?? known?.extract,
        pageprops: page.pageprops ?? known?.pageprops,
      });
    }
    if (!answer.continue) break;
    cont = answer.continue;
  }

  const out: Record<string, RawIntro> = {};
  for (const requested of titles) {
    let title = requested;
    for (let hops = 0; hops < 5 && renamed.has(title); hops++) title = renamed.get(title) as string;
    const page = pages.get(title);
    out[requested] =
      page && !page.missing && page.pageid && page.lastrevid && page.canonicalurl && page.extract
        ? {
            title: page.title,
            pageid: page.pageid,
            revision: page.lastrevid,
            url: page.canonicalurl,
            extract: page.extract,
            ...(page.pageprops?.disambiguation !== undefined ? { disambiguation: true as const } : {}),
          }
        : { missing: true };
  }
  return out;
}

const polities = JSON.parse(readFileSync(POLITIES_FILE, "utf8")) as Record<string, { wikipedia?: string }>;
const titles = [...new Set(Object.values(polities).flatMap((p) => (p.wikipedia ? [p.wikipedia] : [])))].sort();

mkdirSync(OUT_DIR, { recursive: true });
const outFile = join(OUT_DIR, "intros.json");
const save = (intros: Record<string, RawIntro>) =>
  writeFileSync(outFile, JSON.stringify({ api: API, fetchedOn: new Date().toISOString().slice(0, 10), intros }, null, 1));

// Resume from an earlier, interrupted run: only titles not fetched yet are requested.
const intros: Record<string, RawIntro> = existsSync(outFile)
  ? (JSON.parse(readFileSync(outFile, "utf8")) as { intros: Record<string, RawIntro> }).intros
  : {};
const todo = titles.filter((t) => !(t in intros));

for (let i = 0; i < todo.length; i += BATCH) {
  Object.assign(intros, await fetchBatch(todo.slice(i, i + BATCH)));
  save(intros);
  process.stdout.write(`\rfetched ${Math.min(i + BATCH, todo.length)} / ${todo.length}`);
  await sleep(PAUSE_MS);
}
process.stdout.write("\n");
save(intros);

const missing = Object.values(intros).filter((v) => "missing" in v).length;
console.log(`articles requested: ${titles.length}`);
console.log(`with a lead:        ${titles.length - missing}`);
console.log(`missing or empty:   ${missing}`);
console.log(`disambiguation:     ${Object.values(intros).filter((v) => "disambiguation" in v).length}`);
