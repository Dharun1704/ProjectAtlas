# Data sources

Every dataset in `/data/raw` gets a row here **before** it is used: where it came from, the date downloaded and the license.

Licenses marked "to verify" are from memory and must be confirmed on the source's own site before the dataset is used.

| Dataset | Used for | URL | Downloaded | License | Status |
|---|---|---|---|---|---|
| Cliopatria (Seshat) | Borders (primary) | https://github.com/Seshat-Global-History-Databank/cliopatria | 2026-11-11 | CC BY 4.0 (verified 2026-11-11) | In use (v0.2.1) |
| Historical Basemaps | Borders (fallback) | to add | not yet | to verify | Not checked |
| Wikidata | Facts: dates, coordinates, kinds, names, sitelink counts | https://www.wikidata.org | 2026-11-15 | CC0 (verified 2026-11-15) | In use (sitelink counts only) |
| Wikipedia | Summary text (lead extract, shortened) | https://en.wikipedia.org | 2026-11-11 | CC BY-SA 4.0 (verified 2026-11-11) | In use (polity summaries) |
| Natural Earth | Modern base geography, regions | https://www.naturalearthdata.com | 2026-11-11 | Public domain (verified 2026-11-11) | In use (1:50m land and countries, v5.1.2) |

## Cliopatria (checked 2026-11-11)

- **License:** Creative Commons Attribution 4.0 International, stated in the repository's `LICENSE.md` and on its Zenodo record. No non-commercial or share-alike terms. Requires: credit the authors and source, link to the license, say if changes were made.
- **Note:** Seshat's general downloads page mentions CC BY-NC-SA for its other datasets. That page does not name Cliopatria; the Cliopatria repository's own license file is CC BY 4.0.
- **Latest release:** v0.2.1, published 2026-10-03.
- **File:** `cliopatria.geojson.zip`, about 46 MB zipped, containing one `cliopatria.geojson` (roughly 14,000 rows, over 1,600 political entities, 3400 BCE to 2024 CE).
- **Fields:** `Name`, `geometry` (EPSG:4326), `Area` (km²), `Type` (`POLITY` or `RELATION`), `FromYear`, `ToYear` (inclusive), `Wikipedia`, `Wikidata`, optional `SeshatID`.
- **Paper:** https://doi.org/10.1038/s41597-025-04516-9
- **Caveat from the authors:** the maps "reflect only one version of the territory held by past polities".
- **Downloaded:** 2026-11-11 from `https://raw.githubusercontent.com/Seshat-Global-History-Databank/cliopatria/v0.2.1/cliopatria.geojson.zip` to `data/raw/cliopatria/`. SHA-256 `e10a4e429fca708788ff9e7572a95fce801fae55852d217cffabc1c59cd4eed4`. It unzips to `extracted/cliopatria_polities_only_v021.geojson` (173 MB, 13,797 rows), which the pipeline reads.
- **Extra fields found in the file:** `Components` and `MemberOf`, not described in the README.
- **Row kinds, worked out from the data and the authors' `notebooks/map_functions.py`:**
  - plain polities (9,467 rows);
  - polities that are members of a composite, with `MemberOf` set (2,597 rows);
  - composite polities, named in parentheses, with `Components` set (1,348 rows), e.g. "(Warring States China)";
  - `RELATION` rows (385): alliances, personal unions, vassalage. They overlay the polities they connect.
- **What we draw:** `Type == "POLITY"` with empty `Components` (12,064 rows). This is the authors' "Components" view. Composites and relations are left out because they cover the same land as their members.
- **Year numbering (ASSUMPTION, not stated by the authors):** `-N` is read as "N BCE" and converted to astronomical `-N + 1`. Evidence: maps are sampled at round BCE values (-1300, -1240, -1200) and the earliest row is -3400, matching the stated start of 3400 BCE. The file also uses a year 0 (six rows end at 0, their successors start at 1), which does not exist in the BCE/CE calendar; it is mapped onto 1 BCE. If the authors actually meant astronomical numbering, every BCE border is shown one year late. Worth confirming with the Seshat team.
- **Wikidata ids are not unique per polity:** 141 ids are attached to more than one name (e.g. "Assyria" and "Syria" share one). So polity ids are built from the Cliopatria name, and the Wikidata id is kept as a link.
- **Confidence:** the dataset has no per-border confidence. Every border gets `medium`.

## Natural Earth (checked 2026-11-11)

- **License:** public domain. The terms of use say all Natural Earth raster and vector data on the site is in the public domain, may be used in any manner, and that crediting the authors is unnecessary. We credit it anyway.
- **Downloaded:** 2026-11-11 from `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_land.geojson` to `data/raw/natural-earth/`. 1.6 MB, 1,420 features. SHA-256 `e874b27a51d146452be360cafb3cc50c86001074a67d534113e6534682f9826b`.
- **Used for:** the land and coastline backdrop only (`data/processed/base/land.json`, 0.5 MB).
- **Caveat:** these are **modern** coastlines. Shorelines, lakes and river deltas were different in the past, and the app says so in its credit line. Polities are sometimes drawn slightly off the modern coast because the two datasets were made separately.
- **Countries file, downloaded 2026-11-15:** `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson` to `data/raw/natural-earth/`. 3.1 MB, 242 features. SHA-256 `3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb`.
- **Used for:** its `SUBREGION` and `CONTINENT` fields, to group polities by region in the Meanwhile view. Areas it labels "Seven seas (open ocean)" are ignored.
- **Caveats on regions:** they are modern groupings applied to the past. Natural Earth puts all of Russia, including Siberia, in "Eastern Europe", and Iran in "Southern Asia", so a steppe empire can be listed under Eastern Europe. Each polity gets one region: the one holding most of its land at its largest mapped extent. 1,542 of 1,544 polities get a region; two island polities fall outside the 1:50m country shapes and are listed under "Region unknown".

## Wikipedia (checked 2026-11-11)

- **License:** Creative Commons Attribution-ShareAlike 4.0, per Wikipedia's "Reusing Wikipedia content" page. Reusers must: credit by linking to the article, state the license with a link, say if the text was changed, and keep modified text under CC BY-SA.
- **Downloaded:** 2026-11-11 through the public API `https://en.wikipedia.org/w/api.php` (`prop=extracts|info|pageprops`, lead section, plain text) by `pipeline/fetch-wikipedia.ts`, to `data/raw/wikipedia/intros.json` (2.6 MB). Each entry records the article revision it came from.
- **What was requested:** the 1,446 distinct article titles that Cliopatria links its polities to. 1,442 exist with a lead; 4 are missing; 30 are disambiguation pages.
- **Result:** 1,510 of 1,544 polities have a summary (`data/processed/summaries/polities.json`, 0.74 MB). The other 34 show "No summary available".
- **How text is shortened:** whole sentences from the start of the lead, at most three and about 420 characters. Nothing is reworded. Empty brackets left by the API where a pronunciation guide was stripped are removed.
- **Caveat:** the summary describes the article Cliopatria links, which is not always about exactly the mapped polity (for example "Sumerian City-States" links to "History of Sumer"). The app names the article next to every summary.
- **Not deterministic:** articles change, so re-running the fetch can give different text. `build-summaries.ts` is deterministic for a given download.
- **Rate limit:** the API answered 429 at four requests a second; the script now waits a second between requests and backs off when asked.

## Wikidata (checked 2026-11-15)

- **License:** CC0 (public domain) for structured data, per Wikidata's licensing page. No attribution required; the app credits it anyway.
- **Downloaded:** 2026-11-15 by `pipeline/fetch-wikidata.ts` to `data/raw/wikidata/sitelinks.json`, in two lookups:
  1. English Wikipedia's API (`prop=pageprops`): the Wikidata item behind each of the 1,446 article titles Cliopatria links. 1,442 have an item.
  2. Wikidata's API (`wbgetentities`, `props=sitelinks`): the number of sitelinks of 1,458 items (those from step 1 plus the ids Cliopatria gives directly).
- **Used for:** `importance`, which ranks polities inside each region of the Meanwhile view. Nothing else is taken from Wikidata yet.
- **Which item is used:** the one behind the linked Wikipedia article (1,510 polities). Cliopatria's own Wikidata id is the fallback (34 polities: missing or disambiguation articles). Reason: the directly given ids are sometimes an obscure near-duplicate item. Cliopatria's id for "Byzantine Empire" has 1 sitelink and for "Han Dynasty" 15, while the items behind their articles have 192 and 132.
- **Caveat:** 192 polities share their item with another polity (for example a dynasty and the state it ruled), so their count is not theirs alone.
- **What importance measures:** how many Wikipedia-family sites have a page on the topic today. It is a measure of present-day coverage, not of historical weight.
- **Not deterministic:** counts change over time. `build-polity-meta.ts` is deterministic for a given download.

## Attribution shown in the app

- Meanwhile view: "Listed by how widely each is covered on Wikipedia (Wikidata sitelink counts). Regions are modern ones (Natural Earth)."

- Natural Earth land: "Coastlines are modern: Natural Earth 1:50m land" with a link.

- Cliopatria borders: "Borders: Cliopatria, Seshat Global History Databank, CC BY 4.0, simplified" with a link to the repository and the license.

- Wikipedia summaries: "From the Wikipedia article <title>, CC BY-SA 4.0, shortened." with links to the article and the license, on every summary.
- Other datasets: credited in the inspect panel through each record's `sources`.
