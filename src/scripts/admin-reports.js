import { SITE, LEAD_GOAL, CONTACT_GOALS, configuredGoal, gscLink, settledRange, aiFilter, joinSearchPages } from '../lib/admin-analytics.mjs';

const $ = id => document.getElementById(id);
const number = value => Number(value || 0).toLocaleString('en-US');
const pct = value => Number(value || 0).toFixed(2) + '%';
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
let generation = 0;
let property = 'sc-domain:cposeyrealestate.com';
let context = {};

async function request(service, body, signal) {
  const response = await fetch('/admin/api/' + service, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  const value = await response.json();
  if (!response.ok || value?.error) throw new Error(service + ' report unavailable (' + response.status + ')');
  return value;
}
function link(label, href) { return '<a target="_blank" rel="noopener noreferrer" href="' + escape(href) + '">' + escape(label) + ' ↗</a>'; }
function pageLabel(url) { try { const value = new URL(url, SITE); return value.pathname + value.search; } catch { return url; } }
function pageCell(url) { return '<td class="report-page">' + link(pageLabel(url), new URL(url, SITE).href) + '<br>' + link('Search Console', gscLink({ property, ...context, page: url })) + '</td>'; }
function empty(id, columns, message) { $(id).innerHTML = '<tr><td colspan="' + columns + '" class="empty">' + escape(message) + '</td></tr>'; }
function shortcuts() {
  for (const a of document.querySelectorAll('[data-gsc-report]')) a.href = gscLink({ property, ...context, report: a.dataset.gscReport });
  for (const a of document.querySelectorAll('[data-gsc-page]')) a.href = gscLink({ property, ...context, page: a.dataset.gscPage });
  for (const a of document.querySelectorAll('[data-gsc-query]')) a.href = gscLink({ property, ...context, query: a.dataset.gscQuery });
}

async function loadAI(range, signal, active) {
  const query = { date_range: range, filters: [aiFilter()] };
  const [summary, sources, pages] = await Promise.all([
    request('plausible', { ...query, metrics: ['visitors', 'visits'] }, signal),
    request('plausible', { ...query, metrics: ['visitors', 'visits'], dimensions: ['visit:source'], pagination: { limit: 20 } }, signal),
    request('plausible', { ...query, metrics: ['visits'], dimensions: ['visit:entry_page'], pagination: { limit: 10 } }, signal),
  ]);
  if (!active()) return;
  const totals = summary.results?.[0]?.metrics || [0, 0];
  $('aiVisitors').textContent = number(totals[0]); $('aiVisits').textContent = number(totals[1]);
  $('aiStatus').textContent = 'Identifiable AI referrals only. Citations without clicks and visits with no referral information are not included.';
  $('aiSourcesBody').innerHTML = (sources.results || []).map(r => '<tr><td>' + escape(r.dimensions[0] || 'Unspecified source') + '</td><td class="num">' + number(r.metrics[0]) + '</td><td class="num">' + number(r.metrics[1]) + '</td></tr>').join('');
  if (!sources.results?.length) empty('aiSourcesBody', 3, 'No identifiable AI referrals recorded in this period.');
  $('aiPagesBody').innerHTML = (pages.results || []).map(r => '<tr>' + pageCell(r.dimensions[0]) + '<td class="num">' + number(r.metrics[0]) + '</td></tr>').join('');
  if (!pages.results?.length) empty('aiPagesBody', 2, 'No AI landing-page visits recorded in this period.');
}

async function loadConversions(range, signal, active) {
  // A missing goal must remain distinct from a configured goal with zero conversions.
  const response = await fetch('/admin/api/goals', { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('Goal configuration unavailable');
  const config = await response.json();
  const leadName = configuredGoal(config.goals || [], LEAD_GOAL);
  const actionNames = CONTACT_GOALS.map(name => configuredGoal(config.goals || [], name)).filter(Boolean);
  const configured = actionNames.length ? await request('plausible', { metrics: ['visitors', 'events'], date_range: range, dimensions: ['event:goal'], filters: [['is', 'event:goal', actionNames]], pagination: { limit: 100 } }, signal) : { results: [] };
  if (!active()) return;
  const rows = configured.results || [];
  const actions = rows;
  $('contactActionsBody').innerHTML = actions.map(row => '<tr><td>' + escape(row.dimensions[0].replace(' Link Click', ' link clicks')) + '</td><td class="num">' + number(row.metrics[1]) + '</td></tr>').join('');
  if (!actions.length) empty('contactActionsBody', 2, 'No recorded contact-click goals in this period.');
  if (!leadName) {
    $('leadCount').textContent = '—'; $('leadRate').textContent = '—'; $('aiLeadCount').textContent = '—';
    $('leadStatus').textContent = 'Setup needed: add a custom event goal named Lead Submitted in Plausible. This is not a zero-lead count. Tracking was added November 3, 2026.';
    empty('leadSourcesBody', 3, 'Lead reporting needs a configured goal and recorded events.');
    empty('leadPagesBody', 3, 'Lead reporting needs a configured goal and recorded events.');
    return;
  }
  const filters = [['is', 'event:goal', [leadName]]];
  const base = { date_range: range, filters };
  const [summary, sources, pages, ai] = await Promise.all([
    request('plausible', { ...base, metrics: ['events', 'conversion_rate'] }, signal),
    request('plausible', { ...base, metrics: ['visitors', 'events'], dimensions: ['visit:source'], pagination: { limit: 10 } }, signal),
    request('plausible', { ...base, metrics: ['visitors', 'events'], dimensions: ['visit:entry_page'], pagination: { limit: 10 } }, signal),
    request('plausible', { ...base, filters: [...filters, aiFilter()], metrics: ['events'] }, signal),
  ]);
  if (!active()) return;
  const total = summary.results?.[0]?.metrics || [0, 0];
  $('leadCount').textContent = number(total[0]); $('leadRate').textContent = pct(total[1]); $('aiLeadCount').textContent = number(ai.results?.[0]?.metrics?.[0]);
  $('leadStatus').textContent = 'Confirmed form-submission events, not unique people or closed transactions. Conversion rate measures visitors who submitted. Tracking began November 3, 2026.';
  $('leadSourcesBody').innerHTML = (sources.results || []).map(r => '<tr><td>' + escape(r.dimensions[0] || 'Direct / None') + '</td><td class="num">' + number(r.metrics[0]) + '</td><td class="num">' + number(r.metrics[1]) + '</td></tr>').join('');
  $('leadPagesBody').innerHTML = (pages.results || []).map(r => '<tr>' + pageCell(r.dimensions[0]) + '<td class="num">' + number(r.metrics[0]) + '</td><td class="num">' + number(r.metrics[1]) + '</td></tr>').join('');
  if (!sources.results?.length) empty('leadSourcesBody', 3, 'No recorded lead sources in this period.');
  if (!pages.results?.length) empty('leadPagesBody', 3, 'No recorded lead landing pages in this period.');
}

async function loadSearch(range, signal, active) {
  const dates = settledRange(range);
  const currentQuery = { startDate: dates.start, endDate: dates.end, dimensions: ['page'], rowLimit: 1000 };
  const [current, previous, totals, previousTotals, queries, previousQueries] = await Promise.all([
    request('gsc', currentQuery, signal),
    request('gsc', { ...currentQuery, startDate: dates.previousStart, endDate: dates.previousEnd }, signal),
    request('gsc', { startDate: dates.start, endDate: dates.end }, signal),
    request('gsc', { startDate: dates.previousStart, endDate: dates.previousEnd }, signal),
    request('gsc', { ...currentQuery, dimensions: ['query'] }, signal),
    request('gsc', { ...currentQuery, dimensions: ['query'], startDate: dates.previousStart, endDate: dates.previousEnd }, signal),
  ]);
  if (!active()) return;
  property = current._site || property; context = dates; shortcuts();
  const t = totals.rows?.[0]; const p = previousTotals.rows?.[0];
  $('searchDates').textContent = dates.start + '–' + dates.end + '; compared with ' + dates.previousStart + '–' + dates.previousEnd + '. Latest 3 days excluded.';
  $('searchChange').textContent = !t ? 'No search data returned for the selected period.' : !p ? 'No comparison-period data returned.' : 'Google clicks: ' + number(t.clicks) + ' vs ' + number(p.clicks) + ' (' + (t.clicks - p.clicks > 0 ? '+' : '') + number(t.clicks - p.clicks) + '). Impressions: ' + number(t.impressions) + ' vs ' + number(p.impressions) + '.';
  const rows = joinSearchPages(current.rows || [], previous.rows || []).sort((a, b) => (b.current?.impressions || 0) - (a.current?.impressions || 0));
  $('searchPagesBody').innerHTML = rows.slice(0, 25).map(r => '<tr>' + pageCell(r.page) + '<td class="num">' + number(r.current?.clicks) + '</td><td class="num">' + number(r.current?.impressions) + '</td><td class="num">' + (r.current ? pct(r.current.ctr * 100) : '—') + '</td><td class="num">' + (r.current ? Number(r.current.position).toFixed(1) : '—') + '</td><td class="num">' + (!r.previous ? 'New in returned data' : (r.clickChange > 0 ? '+' : '') + number(r.clickChange)) + '</td></tr>').join('');
  if (!rows.length) empty('searchPagesBody', 6, 'No page-level search data returned.');
  const changed = [...rows].filter(row => row.clickChange !== 0).sort((a, b) => Math.abs(b.clickChange) - Math.abs(a.clickChange)).slice(0, 10);
  $('searchChangesBody').innerHTML = changed.map(r => '<tr>' + pageCell(r.page) + '<td class="num">' + number(r.previous?.clicks) + '</td><td class="num">' + number(r.current?.clicks) + '</td><td class="num">' + (r.clickChange > 0 ? '+' : '') + number(r.clickChange) + '</td></tr>').join('');
  if (!changed.length) empty('searchChangesBody', 4, 'No click changes in the returned page data.');
  const queryRows = joinSearchPages(queries.rows || [], previousQueries.rows || []).sort((a, b) => (b.current?.impressions || 0) - (a.current?.impressions || 0)).slice(0, 20);
  $('searchQueryChangesBody').innerHTML = queryRows.map(r => '<tr><td>' + link(r.page, gscLink({ property, ...context, query: r.page })) + '</td><td class="num">' + number(r.current?.clicks) + '</td><td class="num">' + number(r.current?.impressions) + '</td><td class="num">' + (r.current ? pct(r.current.ctr * 100) : '—') + '</td><td class="num">' + (r.current ? Number(r.current.position).toFixed(1) : '—') + '</td><td class="num">' + (!r.previous ? 'New in returned data' : (r.clickChange > 0 ? '+' : '') + number(r.clickChange)) + '</td></tr>').join('');
  if (!queryRows.length) empty('searchQueryChangesBody',6,'No search query data returned.');
}

let controller;
document.addEventListener('admin:refresh', async event => {
  controller?.abort(); controller = new AbortController();
  const id = ++generation; const active = () => id === generation;
  const signal = controller.signal; const range = event.detail.range;
  context = settledRange(range); shortcuts();
  for (const id of ['aiVisitors', 'aiVisits', 'leadCount', 'leadRate', 'aiLeadCount']) $(id).textContent = '—';
  $('aiStatus').textContent = 'Loading AI referrals…'; $('leadStatus').textContent = 'Loading conversion data…'; $('searchChange').textContent = 'Loading page-level search data…';
  for (const [id, cols] of [['aiSourcesBody',3],['aiPagesBody',2],['leadSourcesBody',3],['leadPagesBody',3],['contactActionsBody',2],['searchPagesBody',6],['searchChangesBody',4],['searchQueryChangesBody',6]]) empty(id, cols, 'Loading…');
  await Promise.allSettled([
    loadAI(range, signal, active).catch(error => { if (active() && error.name !== 'AbortError') { $('aiStatus').textContent = 'AI referral report unavailable. Your other analytics still work.'; for (const id of ['aiSourcesBody','aiPagesBody']) empty(id, 3, 'Report unavailable.'); } }),
    loadConversions(range, signal, active).catch(error => { if (active() && error.name !== 'AbortError') { $('leadStatus').textContent = 'Conversion report unavailable. Confirm your Plausible goals and API access; no lead count is inferred.'; for (const id of ['leadSourcesBody','leadPagesBody','contactActionsBody']) empty(id, 3, 'Report unavailable.'); } }),
    loadSearch(range, signal, active).catch(error => { if (active() && error.name !== 'AbortError') { $('searchChange').textContent = 'Page-level search report unavailable. Use the Search Console links above.'; for (const id of ['searchPagesBody','searchQueryChangesBody']) empty(id,6,'Report unavailable.'); empty('searchChangesBody',4,'Report unavailable.'); } }),
  ]);
  if (active()) shortcuts();
});
// Existing query results can finish after page reports; keep their links on the resolved property.
new MutationObserver(shortcuts).observe($('gscQueriesTable'), { childList: true, subtree: true });
