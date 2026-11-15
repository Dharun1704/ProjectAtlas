/**
 * Shortens a Wikipedia article lead to a few whole sentences. It only ever
 * cuts at sentence ends: no words are added, removed or reordered.
 */

/** Words ending in a full stop that do not end a sentence. Lower case. */
const ABBREVIATIONS = new Set([
  "c", "ca", "cf", "fl", "r", "b", "d", "e.g", "i.e", "etc", "vs", "st", "dr", "mr", "mrs", "ms",
  "prof", "no", "vol", "lit", "approx", "est", "jr", "sr", "mt", "ft",
]);

/**
 * Collapses whitespace and removes empty brackets. Wikipedia's plain-text
 * extracts strip pronunciation guides but leave their brackets behind:
 * "The Fake Empire (), also known as".
 */
function normaliseWhitespace(text: string): string {
  return text
    .replace(/\s*\(\s*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Splits text into sentences at ". ", "! " or "? " followed by a capital, digit or opening quote/bracket. */
export function splitSentences(text: string): string[] {
  const clean = normaliseWhitespace(text);
  const sentences: string[] = [];
  let start = 0;
  const boundary = /[.!?]["”’)\]]*\s+(?=[A-Z0-9"“‘(\[])/g;
  for (let match = boundary.exec(clean); match !== null; match = boundary.exec(clean)) {
    const end = match.index + match[0].trimEnd().length;
    const candidate = clean.slice(start, end);
    if (clean[match.index] === ".") {
      const lastWord = candidate.slice(0, -1).split(/[\s(]/).pop() ?? "";
      const isInitial = /^[A-Z]$/.test(lastWord);
      if (isInitial || ABBREVIATIONS.has(lastWord.toLowerCase())) continue;
    }
    sentences.push(candidate);
    start = match.index + match[0].length;
  }
  const rest = clean.slice(start);
  if (rest) sentences.push(rest);
  return sentences;
}

/**
 * Keeps the first sentences of `text`: at most `maxSentences`, and no more
 * than `maxChars` in total, but always at least one whole sentence.
 * `shortened` says whether anything was left out.
 */
export function shortenSummary(
  text: string,
  maxSentences = 3,
  maxChars = 420,
): { text: string; shortened: boolean } {
  const sentences = splitSentences(text);
  const kept: string[] = [];
  let length = 0;
  for (const sentence of sentences) {
    if (kept.length >= maxSentences) break;
    if (kept.length > 0 && length + 1 + sentence.length > maxChars) break;
    kept.push(sentence);
    length += (kept.length > 1 ? 1 : 0) + sentence.length;
  }
  return { text: kept.join(" "), shortened: kept.length < sentences.length };
}
