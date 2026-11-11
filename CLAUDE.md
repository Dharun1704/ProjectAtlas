# History Atlas — Project Guidelines

A 3D globe with a time slider. Drag through history and watch borders, cities, journeys, battles and trade flows change. The goal is to be beautiful, accurate and fun, and above all to make "what was happening everywhere at once" easy to see.

This file is the source of truth for how the project is built. Read it before every task.

---

## 1. Principles (in priority order)

1. **Never invent history.** Every border, event, date, route and number comes from a dataset or a cited source. If data is missing, show it as missing. Never fill gaps with plausible-sounding facts.
2. **Show uncertainty honestly.** Contested or approximate borders and dates are rendered as soft/fuzzy, not as hard lines. Every item carries a confidence level.
3. **The time slider must feel instant.** Scrubbing time is the core interaction. Keep it at 60fps. Never block it on network or heavy computation.
4. **Data and rendering are separate.** Rendering code never knows where data came from. Data code never touches the renderer.
5. **Small, working steps.** Every change leaves the app runnable.

---

## 2. Tech stack

| Area | Choice | Notes |
|---|---|---|
| Language | TypeScript (strict mode) | No `any` without a comment explaining why |
| Build | Vite | |
| UI | React | Only for panels, controls and overlays, not the globe itself |
| Globe | MapLibre GL JS (globe projection) | Wrapped behind a `Renderer` interface so a custom WebGPU renderer can replace it later |
| Overlays | deck.gl | Arcs, particles, paths, points |
| State | Zustand | One store for time, selection, camera and active layers |
| Data scripts | Python or Node scripts in `/pipeline` | Run offline, never in the browser |
| Tests | Vitest | Required for time utilities, interpolation and data loaders |

Ask before adding any dependency not listed here.

---

## 3. Folder structure

```
/src
  /app          React shell, layout, routing
  /globe        Renderer interface + MapLibre/deck.gl implementation
  /layers       One file per visual layer (borders, cities, journeys, battles, flows)
  /time         Year model, slider logic, interpolation
  /data         Typed loaders for processed data (read-only)
  /features     Meanwhile view, follow-a-life, guess-the-year, tours, etc.
  /ui           Shared components (panels, tooltips, timeline)
  /store        Zustand store
/pipeline       Scripts that turn raw data into processed data
/data
  /raw          Original downloaded datasets, untouched
  /processed    Generated output used by the app. NEVER hand-edit
  /authored     Hand-written content: journeys, tours, annotations, corrections
/docs           Data sources, licenses, decisions log
```

---

## 4. Time model

- Years are integers using **astronomical year numbering**: 1 BCE = `0`, 2 BCE = `-1`, 500 BCE = `-499`.
- Display labels convert to BCE/CE in one function only: `formatYear(year)`. Never convert anywhere else.
- Default range: `-3000` to `2025`.
- Events can have a precise year or a range (`year`, `endYear`). Uncertain dates use `circa: true`, plus `earliest` / `latest` when the source gives bounds.
- All time math lives in `/src/time` and is unit tested, especially around the BCE/CE boundary.

---

## 5. Data model

Every record includes `id`, `sources: SourceRef[]` and `confidence: "high" | "medium" | "low"`.

Optional fields are filled **only when the source provides the value**. They are never computed, estimated or guessed. If the source is silent, the field stays empty.

```ts
type Polity = {
  id: string;                // "<dataset>:<name>", e.g. "cliopatria:Roman Empire".
                             // Never auto-merge different names into one polity.
  wikidataId?: string;       // link given by the dataset; NOT unique per polity
  name: string; altNames?: string[];
  start: number; end: number;
  importance?: number;       // Wikidata sitelink count; used to pick "major" items
  color?: string; sources: SourceRef[]; confidence: Confidence;
};

type BorderSnapshot = {
  polityId: string;
  start: number; end: number;   // validity range from the dataset.
                                // A point-in-time snapshot has start === end.
  geometry: GeoJSON.MultiPolygon;
  sources: SourceRef[]; confidence: Confidence;
};

type HistEvent = {
  id: string; title: string; kind: "battle" | "founding" | "treaty" | "disaster" | "other";
  year: number; endYear?: number; circa?: boolean;
  earliest?: number; latest?: number;       // date bounds, only when the source gives them
  location?: [lon: number, lat: number];
  causes?: string[]; effects?: string[];   // ids of other events
  summary: string;                          // shortened Wikipedia lead extract (see Summaries)
  importance?: number;                      // Wikidata sitelink count
  sources: SourceRef[]; confidence: Confidence;
};

type Journey = {
  id: string; person: string;
  // Array order is the travel sequence.
  stops: { year: number; month?: number; circa?: boolean;
           location: [number, number]; note?: string }[];
  sources: SourceRef[]; confidence: Confidence;
};

type SourceRef = { title: string; url?: string; dataset?: string; license?: string };
```

**Point-in-time snapshots.** When a border has `start === end`, the UI labels it "borders as of <year>" and never implies it covers the years around it.

**Journey routes.** Only the stops are sourced. The line between two stops is drawn soft/dashed, because the real route is usually unknown.

**Polity identity.** A polity is identified by its dataset name. Datasets attach one Wikidata ID to several different names, so the ID is a link, not an identity. Links the dataset doesn't provide, and merges of names that really are one polity, go in `/data/authored/corrections`, each with a source.

**Regions** (for the Meanwhile view) come from Natural Earth's region fields, assigned by location.

### Summaries

- Facts (dates, coordinates, kind, names) come from **Wikidata** (CC0).
- Summary text is the lead of the matching **Wikipedia** article (CC BY-SA 4.0), shortened to 1–3 sentences by the pipeline. Nobody writes summaries from memory.
- Every summary shown in the app carries: "From Wikipedia, CC BY-SA 4.0, shortened" with a link to the article. Summary text stays under CC BY-SA.
- No Wikipedia article means no summary. Show it as missing.
- Britannica and other all-rights-reserved sources may be linked, never copied.

---

## 6. Data pipeline rules

- Raw datasets go in `/data/raw` with a note in `/docs/sources.md` covering where they came from, the date downloaded and **the license**. Check the license before using any dataset.
- Sources: Cliopatria / Seshat (primary for borders: polygons with year ranges; CC BY 4.0), Historical Basemaps (fallback border snapshots), Wikidata (events, cities, people with coordinates), Wikipedia (summary text), Natural Earth (modern base geography and regions).
- Processing scripts in `/pipeline` are deterministic. Running them twice gives the same output.
- Corrections to bad data go in `/data/authored/corrections`, applied by the pipeline. Never patch processed files by hand.
- Simplify geometry for the browser. Ship multiple levels of detail for zoom levels.
- Data is split into time chunks (e.g. per century) so the app only loads what's near the current year.

---

## 7. Rendering rules

- All globe code goes through the `Renderer` interface. Features never call MapLibre or deck.gl directly.
- Each layer is independent: it gets the current year and camera, and renders. Layers can be toggled without side effects.
- Border transitions between snapshots fade/cross-dissolve at first. True polygon morphing is a later milestone.
- Low-confidence borders render with a soft, blurred edge. High-confidence borders are crisp.
- Performance budget: 60fps while scrubbing on a mid-range laptop, initial load under 3 seconds, under 5 MB of data for the first view.

---

## 8. Milestones

Do these in order. Each has a definition of done. Don't start the next until the current one works.

**M1 — Bones**
Globe renders, time slider from -3000 to 2025, borders from one dataset change with the year.
*Done when:* scrubbing is smooth and borders update correctly across the BCE/CE boundary.

**M2 — Inspect**
Click a polity or event to see a panel with name, dates, summary, sources and confidence.
*Done when:* every visible item can be clicked and shows its sources.

**M3 — Meanwhile view**
Pick a year and see a list of the major polities and events happening worldwide, grouped by region.
*Done when:* the list and the globe stay in sync with the slider.

**M4 — Follow a life**
One journey (e.g. Ibn Battuta) animates as a moving dot with a trail. Camera can follow it.
*Done when:* the journey plays, pauses and scrubs with the main timeline.

**M5 — Cities and events layer**
Cities appear and grow over time; battles and key events appear as markers.
*Done when:* layers toggle independently and don't drop frames.

**M6 — Fun layer**
Guess-the-year game and an empire territory race.

**Later ideas (not scheduled):** trade/migration particle flows, cause-and-effect arcs, split-screen comparison, battle playback, cinematic tours, what-if timeline forks, "your city through time", ambient mode, custom WebGPU renderer.

---

## 9. Rules for the AI assistant

- **Work in small steps.** One feature or fix per task. Say what you'll change before changing it.
- **Never generate historical data from memory.** If a feature needs data that doesn't exist yet, create an empty typed placeholder and tell me what dataset is needed. Sample/test data must be clearly marked `FAKE_` and kept in test files only.
- **Don't rewrite working code** unless the task asks for it. Prefer small edits.
- **Keep the app runnable** after every change. If something breaks, fix it before moving on.
- **Write tests** for anything in `/src/time`, `/src/data` and `/pipeline`.
- **Ask before:** adding dependencies, changing the data model, changing folder structure, or deleting files.
- **Log decisions.** Any non-obvious choice goes in `/docs/decisions.md` with one line on why.
- **Summarise at the end of each task:** what changed, what to test manually, and anything left unfinished.

---

## 10. Out of scope (for now)

- User accounts, sharing, comments, social features
- Mobile-native apps (the web app should still work on a phone)
- Editing borders inside the app
- Being an encyclopedia. Short summaries plus links to sources, not long articles

---

## 11. Style and feel

- Visual tone: old-map warmth (parchment, ink, muted colours) with modern clarity. Dark mode is a night-sky globe.
- Text is short. A summary is 1–3 sentences. Depth lives behind a "more" click.
- Animations are calm and purposeful, never flashy for its own sake.
