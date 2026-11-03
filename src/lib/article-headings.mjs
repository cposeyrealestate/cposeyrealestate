/** Build an article outline beneath the page H1, retaining existing deep links. */
export function prepareArticleHeadings(html) {
  const headings = [];
  const usedIds = new Set();
  const reservedIds = new Set([...html.matchAll(/\sid\s*=\s*["']([^"']+)["']/gi)].map(match => match[1]));
  let previousLevel = 1;
  let legacyH2Count = 0;
  const content = html.replace(/<h([1-6])\b([^>]*)>([\s\S]*?)<\/h\1\s*>/gi, (_match, rawLevel, attrs, body) => {
    const level = Math.min(Math.max(2, Number(rawLevel)), previousLevel + 1);
    previousLevel = level;
    const text = body.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n))).trim();
    const existingId = attrs.match(/\sid\s*=\s*["']([^"']+)["']/i)?.[1];
    let id = existingId;
    if (!id || usedIds.has(id)) {
      const stem = `article-${text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section'}`;
      id = stem;
      for (let suffix = 2; usedIds.has(id) || reservedIds.has(id); suffix++) id = `${stem}-${suffix}`;
      attrs = attrs.replace(/\s+id\s*=\s*(?:"[^"]*"|'[^']*')/gi, '');
      attrs += ` id="${id}"`;
    }
    usedIds.add(id);
    if (level === 2) headings.push({ id, text });
    // The old template numbered H2 anchors. Keep those inbound links working
    // while the table of contents uses stable, descriptive or authored IDs.
    const legacyId = Number(rawLevel) === 2 ? `article-section-${++legacyH2Count}` : undefined;
    const alias = legacyId && legacyId !== id && !usedIds.has(legacyId) && !reservedIds.has(legacyId)
      ? `<span id="${legacyId}" aria-hidden="true"></span>` : '';
    if (alias) usedIds.add(legacyId);
    return `${alias}<h${level}${attrs}>${body}</h${level}>`;
  });
  return { content, headings };
}
