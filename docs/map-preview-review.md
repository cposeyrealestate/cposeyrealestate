# Illustrated Hill Country map review — version 04

Preview: https://cposey-map-review-20261112.codyposey.workers.dev/?v=4

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
