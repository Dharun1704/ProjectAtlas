# Data sources

Every dataset in `/data/raw` gets a row here **before** it is used: where it came from, the date downloaded and the license.

Licenses marked "to verify" are from memory and must be confirmed on the source's own site before the dataset is used.

| Dataset | Used for | URL | Downloaded | License | Status |
|---|---|---|---|---|---|
| Cliopatria (Seshat) | Borders (primary) | https://github.com/Seshat-Global-History-Databank/cliopatria | 2026-11-11 | CC BY 4.0 (verified 2026-11-11) | In use (v0.2.1) |
| Historical Basemaps | Borders (fallback) | to add | not yet | to verify | Not checked |
| Wikidata | Facts: dates, coordinates, kinds, names, sitelink counts | https://www.wikidata.org | not yet | CC0 (to verify) | Not checked |
| Wikipedia | Summary text (lead extract, shortened) | https://www.wikipedia.org | not yet | CC BY-SA 4.0 (to verify) | Not checked |
| Natural Earth | Modern base geography, regions | https://www.naturalearthdata.com | 2026-11-11 | Public domain (verified 2026-11-11) | In use (1:50m land, v5.1.2) |

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
- **Not yet downloaded:** the country and region files needed for the Meanwhile view (M3).

## Attribution shown in the app

- Natural Earth land: "Coastlines are modern: Natural Earth 1:50m land" with a link.

- Cliopatria borders: "Borders: Cliopatria, Seshat Global History Databank, CC BY 4.0, simplified" with a link to the repository and the license.

- Wikipedia summaries: "From Wikipedia, CC BY-SA 4.0, shortened" with a link to the article, on every summary.
- Other datasets: credited in the inspect panel through each record's `sources`.
