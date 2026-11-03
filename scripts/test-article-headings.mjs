import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareArticleHeadings } from '../src/lib/article-headings.mjs';

test('older article headings form an outline under the single page H1', () => {
  const result = prepareArticleHeadings('<h3>Opening question</h3><p>Answer</p><h2>Major topic</h2><h4>Supporting detail</h4><h2>Next topic</h2>');
  assert.deepEqual([...result.content.matchAll(/<h([1-6])\b/g)].map(match => Number(match[1])), [2, 2, 3, 2]);
  assert.deepEqual(result.headings.map(heading => heading.text), ['Opening question', 'Major topic', 'Next topic']);
});

test('authored deep links and old numbered links survive outline generation', () => {
  const result = prepareArticleHeadings('<h2 id="loan-rules" class="answer">Loan &amp; eligibility</h2><h3>Documents</h3>');
  assert.match(result.content, /id="loan-rules" class="answer"/);
  assert.match(result.content, /id="article-section-1"/);
  assert.equal(result.headings[0].id, 'loan-rules');
  assert.equal(result.headings[0].text, 'Loan & eligibility');
});

test('repeated headings have unique anchors without colliding with other content', () => {
  const result = prepareArticleHeadings('<div id="article-costs"></div><h2>Costs</h2><h2>Costs</h2><h2 id="custom">Plan</h2><h2 id="custom">Plan again</h2>');
  const ids = [...result.content.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const heading of result.headings) assert.ok(ids.includes(heading.id));
});

test('nested content remains nested and a body H1 cannot create a second page title', () => {
  const result = prepareArticleHeadings('<h1>Imported title</h1><h2>Topic</h2><h3>Details</h3><h4>Example</h4>');
  assert.deepEqual([...result.content.matchAll(/<h([1-6])\b/g)].map(match => Number(match[1])), [2, 2, 3, 4]);
});
