# Hill Country map design preview

Preview: https://cposey-map-review-20261112.codyposey.workers.dev/

Source: public/map-preview/index.html (self-contained). A separate preview Worker serves this HTML with noindex headers; it does not change the main website or its routing.

The road centerlines are generalized schematic geometry, not imported road GIS data. Validate and replace them before claiming geographic road precision. Original Census-derived area outlines and lake geometry were retained from RelocationMap.astro. No drive-time claims are made.

The existing production component remains untouched for Muse's work. Prototype features: visible road corridors, optional outlines, community and military filters, place selection, search, keyboard interaction, expandable map, and horizontal map scrolling on phones.

To serve the preview Worker: return the index.html contents as a UTF-8 HTML Response for GET/HEAD; use X-Robots-Tag: noindex, nofollow and Cache-Control: no-store. The preview uses no credentials, databases, third-party script dependencies or lead capture.
