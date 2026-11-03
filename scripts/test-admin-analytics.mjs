import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import * as helpers from '../src/lib/admin-analytics.mjs';

test('Search Console links preserve exact page/query filters and resolved domain property', () => {
  const url = new URL(helpers.gscLink({ property: 'sc-domain:cposeyrealestate.com', page: '/blog/a/?x=1&y=2', query: 'homes & land', start: '2026-10-04', end: '2026-10-31' }));
  assert.equal(url.hostname, 'search.google.com');
  assert.equal(url.searchParams.get('resource_id'), 'sc-domain:cposeyrealestate.com');
  assert.equal(url.searchParams.get('page'), '!https://cposeyrealestate.com/blog/a/?x=1&y=2');
  assert.equal(url.searchParams.get('query'), '!homes & land');
  assert.equal(url.searchParams.get('start_date'), '2026-10-04');
  assert.equal(new URL(helpers.gscLink({ report: 'indexing' })).pathname, '/search-console/index');
});
test('settled periods exclude three days and compare equal nonoverlapping windows across year boundaries', () => {
  assert.deepEqual(helpers.settledRange('7d', new Date(2026, 0, 4)), { start: '2025-12-26', end: '2026-01-01', previousStart: '2025-12-19', previousEnd: '2025-12-25' });
});
test('search comparison retains lost pages without implying they were deindexed', () => {
  const rows = helpers.joinSearchPages([{ keys:['/new'], clicks:2 }], [{ keys:['/lost'], clicks:3 }]);
  assert.equal(rows.find(r => r.page === '/lost').clickChange, -3);
  assert.equal(rows.find(r => r.page === '/new').previous, null);
});
test('goal resolution uses event identity, respects renamed labels, and excludes partial property goals', () => {
  assert.equal(helpers.configuredGoal([{ event_name:'Lead Submitted',display_name:'Partial',custom_props:{form:'contact'} }], 'Lead Submitted'), null);
  assert.equal(helpers.configuredGoal([{ event_name:'Lead Submitted',display_name:'All inquiries',custom_props:{} }], 'Lead Submitted'), 'All inquiries');
});
test('AI patterns accept known referrers without counting lookalike hosts', () => {
  const clauses = helpers.aiFilter()[1];
  const regex = new RegExp(clauses.find(x => x[1] === 'visit:referrer')[2][0]);
  assert.equal(regex.test('chatgpt.com/search'), true);
  assert.equal(regex.test('chatgpt.com.evil.example/search'), false);
  assert.equal(regex.test('example.com/chatgpt.com'), false);
});

const script = readFileSync('src/scripts/admin-reports.js','utf8').replace(/^import .*;\n/, '');
async function runReport({ goal = false, aiFailure = false, searchFailure = false } = {}) {
  const nodes = new Map(); const listeners = {}; const calls = [];
  const node = id => { if (!nodes.has(id)) nodes.set(id,{textContent:'',innerHTML:''}); return nodes.get(id); };
  const fetch = async (url, options = {}) => {
    const body = options.body ? JSON.parse(options.body) : null; calls.push({ url, body });
    if (url.endsWith('/goals')) return { ok:true,json:async()=>({goals:goal?[{event_name:'Lead Submitted',display_name:'Lead Submitted'}]:[]}) };
    if (url.endsWith('/gsc')) return {ok:!searchFailure,status:searchFailure?502:200,json:async()=>searchFailure?{error:'Unavailable'}:{rows:[],_site:'sc-domain:cposeyrealestate.com'}};
    if (aiFailure && body.filters?.[0]?.[0] === 'or') return {ok:false,status:502,json:async()=>({error:'Unavailable'})};
    return {ok:true,status:200,json:async()=>({results:body.dimensions?.length?[]:[{metrics:body.metrics.map(()=>0)}]})};
  };
  const context = vm.createContext({ ...helpers, document:{getElementById:node,querySelectorAll:()=>[],addEventListener:(name,cb)=>listeners[name]=cb},fetch,URL,AbortController,MutationObserver:class {observe(){}},console });
  vm.runInContext(script,context);
  await listeners['admin:refresh']({detail:{range:'28d'}});
  return {node,calls};
}
test('missing goal shows setup state rather than a fabricated zero', async()=>{
  const {node,calls}=await runReport();
  assert.equal(node('leadCount').textContent,'—');
  assert.match(node('leadStatus').textContent,/Setup needed/);
  assert.equal(calls.some(c=>c.body?.filters?.some(f=>f[1]==='event:goal'&&f[2]?.includes('Lead Submitted'))),false);
  assert.equal(node('aiVisitors').textContent,'0');
});
test('configured goal with no events renders a verified zero and percentage',async()=>{
  const {node}=await runReport({goal:true});
  assert.equal(node('leadCount').textContent,'0');
  assert.equal(node('leadRate').textContent,'0.00%');
  assert.equal(node('aiLeadCount').textContent,'0');
});
test('AI failure leaves conversion and search reporting operational',async()=>{
  const {node}=await runReport({goal:true,aiFailure:true});
  assert.match(node('aiStatus').textContent,/unavailable/);
  assert.equal(node('aiVisitors').textContent,'—');
  assert.equal(node('leadCount').textContent,'0');
  assert.match(node('searchChange').textContent,/No search data/);
});
test('search failure keeps valid AI and conversion counts',async()=>{
  const {node}=await runReport({goal:true,searchFailure:true});
  assert.match(node('searchChange').textContent,/unavailable/);
  assert.equal(node('aiVisits').textContent,'0');
  assert.equal(node('leadCount').textContent,'0');
});
