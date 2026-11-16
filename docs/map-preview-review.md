# Illustrated Hill Country map review — version 05

Preview: https://cposey-map-review-20261112.codyposey.workers.dev/?v=5

Self-contained interactive source: public/map-preview/index.html. Standalone artwork: public/map-preview/illustrated-map.svg. Production RelocationMap.astro is untouched. Preview Worker responds with noindex and no-store headers.

## Current implementation

Custom SVG illustration with dark teal land, generalized living areas, prominent Canyon Lake and river shapes, selected major roads, deliberately positioned labels, and military markers. Community shapes and labels select a guide below the map. Search accepts area names and ZIPs. Labels support keyboard selection; mobile has an enlarge/fit control and horizontally scrollable enlarged map.

## Geography and sources

Census TIGERweb services at https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/:
- PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1: 2020 ZCTA polygons, filtered by the ZIPs embedded in HTML. Grouped with Shapely unary_union and simplified with preserve_topology at 0.0025 degrees.
- Transportation/MapServer/2: primary road geometry for envelope -99,29.05,-97.65,30.2. Generalized at 0.001 degrees. Selected routes and named freeway aliases retained; street-level clutter omitted.
- Hydro/MapServer/1: Canyon Lake polygon (NAME LIKE '%Canyon%').
- Hydro/MapServer/0: Guadalupe, Comal, San Antonio, and Cibolo water lines (BASENAME filter).

Projection: x=440+(longitude+98.4936)*615; y=700-(latitude-29.4241)*707. Geographic anchors and leader lines connect placed labels to the relevant community. Military stars are approximate installation locations, not visitor gates.

## Driving rings

Centered at downtown San Antonio (-98.4936,29.4241), with SVG radii 80, 180, and 380. Approximately 8, 18, and 38 straight-line miles, labeled 15, 30, and 60 minutes per the user's request for estimated circles. These are illustrative, not routing-derived isochrones or live traffic estimates. This limitation is stated on the page. Do not market them as calculated travel times.

## Validation and review

Verified rendering, community selection, search, ring toggle, reset, and 390px mobile layout in browser. No remote tiles, external JS, or WebGL required. Area groupings and travel-ring sizing remain editorial review items before production integration. Some community links intentionally lead to a broader corridor guide; descriptions explain that scope.

## Version 05 accuracy corrections (2026-11-13)

Replaced the entire highway layer with TxDOT_Roadways/FeatureServer/0 geometry (EXT_DATE 11-01-2026), using RDBD_TYPE Single Roadbed, Right Roadbed, or Left Roadbed. Filtered route prefixes/numbers: SL1604, US90, US281, SH46, SH211, IH37, IH10, IH35, IH410. Envelope: -99.25,28.80,-97.50,30.25. Retrieved all 61 matching object IDs and all 61 features, avoiding transfer-limit truncation. No invented connectors. Geometry is clipped to the envelope, projected with the existing map projection, and simplified by 0.12 SVG units. Shields snap to the selected route geometry.

Added Census current incorporated-place geometry for STATE=48, PLACE=65000 (San Antonio city), subtracting separately featured ZIP regions to prevent overlapping click targets. This is municipal context, not an invented metro outline. Filled the missing Encino Park ZIP 78259 by combining it with existing 78258 and 78260. Display name Stone Oak / Encino Park assumes the user's Stone Park wording was a typo; the footprint also covers other north-side neighborhoods and remains explicitly approximate.

Removed all city leader lines. All twelve label anchors were checked to fall inside their corresponding shaded region; nearby labels were sized and positioned without label-label collisions. Very small areas use 10px labels whose text can extend beyond the narrow polygon, while their centers remain inside. Downtown and ring labels are reserved from label/shield collisions. San Antonio selection and ZIP 78259 search tested in browser; published v5 rendered and visually checked.

Rebuild source is under scripts/map-preview-v5/. Place the scripts in a work/ folder, retrieve map-v4.html from public/map-preview/index.html at commit 520b6532d328a6a48c6eb61c40b997e744256fc4, install Shapely locally (or into work/pydeps), then run fetch-v5.py, fetch-routes.py, and build-v5.py from the parent folder. Source datasets may change after the listed extraction date. The embedded SVG preserves the reviewed snapshot.
