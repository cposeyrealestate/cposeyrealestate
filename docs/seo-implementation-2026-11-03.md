# Site structure, entity consistency, and lead reliability — November 3, 2026

The generated site already had distinct titles, descriptions, canonicals, article metadata, and sitemap filtering. This update builds on those foundations rather than replacing working SEO content.

## Changes

- Correct heading nesting across the shared blog template and affected guide, directory, video, calculator, and homepage components. Navigation group labels are paragraphs, not headings preceding each page H1. Article FAQs use H3 questions below their H2 section.
- Preserve authored article anchor IDs and legacy numbered H2 anchors while generating a linked table of contents. Older imported content cannot introduce a second H1 or skip a heading level.
- Define the business, person, brokerage, and website consistently on all Layout pages; retain page-specific schema nodes without repeating top-level entity IDs. Add WebPage/ProfilePage information tied to the same publisher and website.
- Keep professional designations under credentials rather than representing them as awards. Keep TREC as the licensing authority rather than an organizational membership. Include Garden Ridge and Boerne in the shared service areas, matching existing area guides.
- Attribute guest articles consistently in HTML author metadata and featured article cards.
- Generate llms.txt from the shared business record and current article data. Remove stale review/library-count superlatives and conflicting Sunday hours from the old file. AI prompt review counts also use the shared record. This optional resource is excluded from the HTML sitemap and does not guarantee AI visibility.
- Disallow administrative routes in robots.txt; existing API and wrapper exclusions remain.
- Fix homepage contact and valuation-modal handlers that previously showed success after rejected or failed requests. Confirm success before acknowledging receipt; preserve entries and allow retry on errors. Remove browser logging of the homepage visitor payload.
- Add Plausible events for confirmed primary contact/valuation/signup/guide submissions, phone links, email links, and consultation-link intent. Custom properties contain only a fixed form identifier, never visitor contact details. These events do not claim a phone call or appointment was completed.
- Add rendered-output checks for one H1 per sitemap page, heading order, empty headings, image alt attributes, and article navigation targets. Add a pull-request workflow to run tests, production build, and output checks.

## Validation

Baseline: 230 generated HTML documents; 229 sitemap URLs. A separate outline scan found 176 issues across 160 documents (navigation headings excluded from that baseline).

After changes: production build passes; 229 sitemap URLs pass the output audit, including 4,914 headings, canonical and description presence, unique page titles, image alt attributes, valid JSON-LD, and complete emitted video metadata. The separate outline scan reports zero issues. Four article-outline tests and ten simulated form-response tests pass, including HTTP rejection, unconfirmed success, malformed JSON, network failure, retries, and confirmed receipt. Tests use a fake transport and do not create CRM leads.

## Limits and follow-up

This does not establish Google index coverage, rankings, qualified leads, or citation rates. Those need Search Console, analytics, and CRM measurements over time. Custom Plausible events may require goal configuration in the analytics dashboard. No live CRM submission or booking was performed.

The existing dependency lockfile reported advisories during installation and was not upgraded as part of this content/lead-flow update. Dependency remediation should be reviewed separately with compatible framework versions.

The local checkout excluded large media to keep testing focused; deployment must use the complete repository through the existing Cloudflare build integration, not upload this partial local asset directory.
