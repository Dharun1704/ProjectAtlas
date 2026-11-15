/** Polite HTTP for the fetch steps of the pipeline. */

const USER_AGENT = "HistoryAtlasPipeline/0.1 (offline data pipeline)";
const MAX_RETRIES = 6;

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** GETs a JSON document, backing off when the server asks us to slow down (429) or is failing (5xx). */
export async function getJsonWithRetry(url: string): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (response.ok) return response.json();
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt >= MAX_RETRIES) throw new Error(`${new URL(url).host} answered ${response.status}`);
    const retryAfter = Number(response.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 5000 * 2 ** attempt;
    process.stdout.write(`\n  asked to slow down (${response.status}); waiting ${Math.round(waitMs / 1000)}s\n`);
    await sleep(waitMs);
  }
}
