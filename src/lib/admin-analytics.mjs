export const SITE = 'https://cposeyrealestate.com/';
export const LEAD_GOAL = 'Lead Submitted';
export const CONTACT_GOALS = ['Phone Link Click', 'Email Link Click', 'Consultation Link Click'];
export function configuredGoal(goals, name) {
  return goals.find(goal => goal.event_name === name && Object.keys(goal.custom_props || {}).length === 0)?.display_name || null;
}

export function gscLink({ property = 'sc-domain:cposeyrealestate.com', report = 'performance', start, end, page, query } = {}) {
  const paths = { performance: 'performance/search-analytics', ai: 'performance/search-analytics/ai', overview: '', indexing: 'index', sitemaps: 'sitemaps' };
  const url = new URL('https://search.google.com/search-console/' + (paths[report] ?? paths.performance));
  url.searchParams.set('resource_id', property);
  if (report === 'performance' || report === 'ai') {
    if (start && end) { url.searchParams.set('start_date', start.replaceAll('-', '')); url.searchParams.set('end_date', end.replaceAll('-', '')); }
    if (page) url.searchParams.set('page', '!' + new URL(page, SITE).href);
    if (query) url.searchParams.set('query', '!' + query);
  }
  return url.href;
}

export function settledRange(range, now = new Date()) {
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - 3));
  const days = { '7d': 7, '28d': 28, '91d': 91, '12mo': 365 }[range] || 28;
  const start = new Date(end); start.setUTCDate(end.getUTCDate() - days + 1);
  const previousEnd = new Date(start); previousEnd.setUTCDate(start.getUTCDate() - 1);
  const previousStart = new Date(previousEnd); previousStart.setUTCDate(previousEnd.getUTCDate() - days + 1);
  const iso = date => date.toISOString().slice(0, 10);
  return { start: iso(start), end: iso(end), previousStart: iso(previousStart), previousEnd: iso(previousEnd) };
}

// Match explicit source identities rather than substrings such as "ai" or "openai" in unrelated URLs.
const AI_SOURCE = '^(ChatGPT|OpenAI|Perplexity|Microsoft Copilot|Copilot|Google Gemini|Gemini|Claude|Anthropic|Grok|You\\.com|Phind|DeepSeek|chatgpt\\.com|chat\\.openai\\.com|perplexity\\.ai|copilot\\.microsoft\\.com|gemini\\.google\\.com|claude\\.ai|grok\\.com|you\\.com|phind\\.com|deepseek\\.com)$';
const AI_REFERRER = '^(www\\.)?(chatgpt\\.com|chat\\.openai\\.com|perplexity\\.ai|copilot\\.microsoft\\.com|gemini\\.google\\.com|claude\\.ai|grok\\.com|you\\.com|phind\\.com|chat\\.deepseek\\.com)(/|$)';
export function aiFilter() {
  return ['or', [
    ['matches', 'visit:source', [AI_SOURCE]],
    ['matches', 'visit:referrer', [AI_REFERRER]],
    ['is', 'visit:source', ['Meta AI', 'meta.ai', 'l.meta.ai']],
    ['matches', 'visit:referrer', ['^([a-z]+\\.)?meta\\.ai(/|$)']],
    ['is', 'visit:utm_source', ['chatgpt.com', 'chatgpt', 'perplexity', 'perplexity.ai', 'copilot', 'gemini', 'claude', 'grok', 'deepseek'], { case_sensitive: false }],
  ]];
}

export function joinSearchPages(current, previous) {
  const before = new Map(previous.map(row => [row.keys[0], row]));
  const now = new Map(current.map(row => [row.keys[0], row]));
  return [...new Set([...now.keys(), ...before.keys()])].map(page => ({
    page, current: now.get(page) || null, previous: before.get(page) || null,
    clickChange: (now.get(page)?.clicks || 0) - (before.get(page)?.clicks || 0),
  }));
}
