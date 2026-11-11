# Decisions log

One line per non-obvious choice, with the reason. Newest at the bottom.

| Date | Decision | Why |
|---|---|---|
| 2026-11-11 | Optional data fields are filled only when the source provides the value | Keeps "never invent history" enforceable at the field level |
| 2026-11-11 | `BorderSnapshot.year` replaced by `start` / `end` | A single year didn't say how long a border was valid; ranges come straight from the dataset |
| 2026-11-11 | Point-in-time snapshots use `start === end` and are labelled "borders as of <year>" | Avoids implying a snapshot covers years the source says nothing about |
| 2026-11-11 | Cliopatria is the primary border source, Historical Basemaps the fallback (pending license check) | Cliopatria polygons carry year ranges, which suits a continuous slider |
| 2026-11-11 | `HistEvent` gains optional `earliest` / `latest` alongside `circa` | A boolean can't show how uncertain a date is |
| 2026-11-11 | Journey stop order is the array order; stops gain optional `month` and `circa` | Year-only stops can't order several stops within one year |
| 2026-11-11 | Lines between journey stops render soft/dashed | Only the stops are sourced; the route between them usually isn't |
| 2026-11-11 | Polity `id` is the Wikidata ID when the dataset links one; unmatched names are never auto-merged | Stable identity across snapshots without guessing that two names are the same polity |
| 2026-11-11 | "Major" is ranked by Wikidata sitelink count, stored as `importance` | A measurable number, not an editorial judgment |
| 2026-11-11 | Regions come from Natural Earth's region fields, assigned by location | Reuses a dataset already in the stack; modern regions are anachronistic but consistent |
| 2026-11-11 | Summaries are shortened Wikipedia lead extracts with per-item attribution, replacing "written in our own words" | Nobody writes history from memory; hand-writing thousands of summaries duplicates existing work |
| 2026-11-11 | Britannica and other all-rights-reserved sources are link-only | Their text can't be legally copied or extracted |
| 2026-11-11 | `SourceRef` gains optional `license` | Wikipedia text needs its license shown next to each summary |
| 2026-11-11 | Time-filtered layers carry `start` / `end` on each feature; the renderer changes only a filter when the year moves | Scrubbing never re-uploads geometry, which keeps the slider cheap |
| 2026-11-11 | Year changes go from the store straight to the renderer, not through React rendering | Keeps React out of the scrubbing hot path |
| 2026-11-11 | The globe shows a generated latitude/longitude grid until base geography is loaded | Makes the sphere readable without inventing or downloading any geography |
| 2026-11-11 | MapLibre's worker is imported with Vite's `?worker&url` and passed to `setWorkerUrl` | MapLibre's default worker URL 404s under Vite's dependency pre-bundling |
| 2026-11-11 | `@types/geojson` added as a dev dependency (types only) | The data model uses GeoJSON types; MapLibre already depends on the same package |
| 2026-11-11 | deck.gl is not installed yet | Nothing in M1 draws overlays; add it with the first overlay layer |
| 2026-11-11 | Draw only Cliopatria rows with `Type == "POLITY"` and no `Components` | Composite and `RELATION` rows cover the same land as their members and would be painted twice; this is the authors' own "Components" view |
| 2026-11-11 | Cliopatria year `-N` is read as N BCE (astronomical `-N + 1`); its year 0 is mapped onto 1 BCE | The data is sampled at round BCE values and starts at -3400 for "3400 BCE". Not confirmed by the authors, so recorded as an assumption in sources.md |
| 2026-11-11 | Polity `id` is `cliopatria:<Name>`; the Wikidata id is stored separately as `wikidataId`. Replaces "id is the Wikidata ID" | In Cliopatria 141 Wikidata ids are shared by different names (e.g. Assyria and Syria), so using them as ids would merge distinct polities |
| 2026-11-11 | Every Cliopatria border gets `confidence: "medium"` | The dataset has no per-border confidence, and its authors say the maps show only one version of past territory |
| 2026-11-11 | Geometry is simplified with our own Douglas-Peucker (0.05 degrees, 2 decimals), one level of detail | Avoids a new dependency for M1. It does not preserve shared edges, so small gaps or overlaps between neighbours are possible; a topology-aware tool (e.g. mapshaper) is the later fix |
| 2026-11-11 | A polity too small to survive simplification keeps its largest original ring | No polity should vanish from the map because of simplification (4 rows affected) |
| 2026-11-11 | A snapshot is copied into every century chunk its range touches | One chunk then holds everything needed for any year inside it |
| 2026-11-11 | Vite serves `data/processed` as its public directory | The app fetches pipeline output directly; nothing is copied or hand-edited |
| 2026-11-11 | Pipeline scripts are TypeScript run directly by Node | One language and one test runner for app and pipeline; Node 26 runs `.ts` files natively |
| 2026-11-11 | Polity fill colours come from a hash of the polity id over a fixed muted palette | Colour only separates neighbours; it must be stable across years and carries no historical meaning |
| 2026-11-11 | `@types/node` added as a dev dependency (types only) | The pipeline uses Node's file APIs |
| 2026-11-11 | The app keeps at most 8 century chunks in memory and preloads the two neighbouring centuries | Bounds memory while making chunk crossings quick |
| 2026-11-11 | The time slider is a ruler that slides under a fixed needle, with drag, zoom, click-to-jump and keyboard control | A plain slider put about eight years under each pixel; the ruler gives both a wide overview and single-year precision |
| 2026-11-11 | Ruler ticks sit on round *displayed* years (100 BCE is astronomical -99), plus a tick at 1 CE | Round astronomical years would label BCE ticks "101 BCE", "201 BCE" |
| 2026-11-11 | The timeline ends at the last year the border data covers (2024), inside the default range of -3000 to 2025 | Borders are the only data so far, and a year past them showed an empty globe; revisit when other layers have data for later years |
| 2026-11-11 | On the last year of the timeline the app shows a notice that the border data ends there | The user should know the timeline stops because of the data, not by design |
| 2026-11-11 | Ruler labels within 30 px of the needle are hidden | The needle cut through them; the large readout already shows that year |
| 2026-11-11 | Land backdrop is Natural Earth 1:50m land, drawn under the borders and labelled as modern coastlines | Gives the globe recognisable shape; honest that past coastlines differed |
| 2026-11-11 | Layers carry a `z` value and the renderer stacks them by it | Layers load in any order (land and borders arrive asynchronously) but must always stack the same way |
| 2026-11-11 | Dark mode follows the system setting; globe colours live in `src/layers/theme.ts`, panel colours in CSS variables | One switch for the whole app, no extra control yet |
| 2026-11-11 | Clicking reports the topmost clickable feature through `Renderer.onClick`; the app builds the selection from loaded data | Keeps MapLibre out of feature code and keeps the renderer ignorant of what a polity is |
| 2026-11-11 | The inspect panel shows "Mapped in this dataset: first year to last year" from `polities.json`, not a polity's founding and end dates | Those are the years Cliopatria has borders for, which is what we actually know; real start/end dates need Wikidata |
| 2026-11-11 | The inspect panel says "No summary yet" | Summaries need the Wikipedia pipeline, which is not built; missing data is shown as missing |
| 2026-11-11 | Git ignores `data/raw` and tracks `data/processed` | Raw files are large (220 MB) and reproducible from the URLs and hashes in sources.md; tracking processed data lets the app run straight after a clone |

