/** Fetches a JSON file by path relative to the processed-data root. Resolves null when it does not exist. */
export type FetchJson = (path: string) => Promise<unknown>;

export const browserFetchJson: FetchJson = async (path) => {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`);
  // The dev server answers unknown paths with index.html, so check the type too.
  const isJson = response.headers.get("content-type")?.includes("json") ?? false;
  if (response.status === 404 || (response.ok && !isJson)) return null;
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
  return response.json();
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
