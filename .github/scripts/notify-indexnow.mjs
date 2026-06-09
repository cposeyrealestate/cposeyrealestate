#!/usr/bin/env node
/**
 * Diffs the current src/data/blog-posts.json against the previous commit,
 * waits for Cloudflare Pages to publish the new URLs, and submits them
 * to IndexNow.
 *
 * Runs from the repo root in GitHub Actions. Logs progress and never
 * exits with an error code that blocks deploys — IndexNow is a notification,
 * not a critical path.
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const SITE = 'https://cposeyrealestate.com';
const HOST = 'cposeyrealestate.com';
const KEY = '6a9914e50be052ff5428ede33c5b64fa';
const KEY_LOCATION = `${SITE}/${KEY}.txt`;
const POSTS_PATH = 'src/data/blog-posts.json';

// Polling config for waiting on the Cloudflare Pages deploy.
const POLL_MAX_MS = 10 * 60 * 1000; // 10 minutes
const POLL_INTERVAL_MS = 30 * 1000; // every 30 seconds

function readJsonAtCommit(ref) {
  try {
    const raw = execSync(`git show ${ref}:${POSTS_PATH}`, { encoding: 'utf8' });
    return JSON.parse(raw);
  } catch {
    return null; // file didn't exist at that ref (e.g., first run)
  }
}

function postSignature(post) {
  // Treat a post as "changed" if slug is new OR dateRaw moved.
  return `${post.slug}|${post.dateRaw || ''}`;
}

function diffPosts(prev, curr) {
  const prevSigs = new Map((prev || []).map((p) => [p.slug, postSignature(p)]));
  const changed = [];
  for (const post of curr) {
    if (!post.slug) continue;
    const before = prevSigs.get(post.slug);
    const now = postSignature(post);
    if (before !== now) changed.push(post.slug);
  }
  return changed;
}

async function urlIsLive(url) {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForUrls(urls) {
  const deadline = Date.now() + POLL_MAX_MS;
  const pending = new Set(urls);
  while (pending.size > 0 && Date.now() < deadline) {
    const checks = await Promise.all(
      [...pending].map(async (u) => [u, await urlIsLive(u)]),
    );
    for (const [u, live] of checks) {
      if (live) {
        console.log(`  live: ${u}`);
        pending.delete(u);
      }
    }
    if (pending.size === 0) break;
    console.log(`  waiting on ${pending.size} URL(s)…`);
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  if (pending.size > 0) {
    console.warn(
      `Timed out waiting for ${pending.size} URL(s) after ${POLL_MAX_MS / 1000}s — submitting anyway.`,
    );
  }
}

async function submitIndexNow(urls) {
  const body = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls,
  };
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  // 200 = accepted, 202 = accepted (will be processed),
  // 422 = invalid URLs (some), 403 = key not found at keyLocation.
  console.log(`IndexNow response: ${res.status} ${res.statusText}`);
  if (!res.ok && res.status !== 202) {
    const text = await res.text().catch(() => '');
    if (text) console.log(`IndexNow body: ${text}`);
  }
}

async function main() {
  let urls;

  const manual = process.env.MANUAL_URLS?.trim();
  if (manual) {
    urls = manual
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    console.log(`Manual override: submitting ${urls.length} URL(s).`);
  } else {
    const curr = JSON.parse(readFileSync(POSTS_PATH, 'utf8'));
    const prev = readJsonAtCommit('HEAD~1');
    const changedSlugs = diffPosts(prev, curr);
    if (changedSlugs.length === 0) {
      console.log('No new or updated blog posts in this push. Skipping.');
      return;
    }
    urls = changedSlugs.map((slug) => `${SITE}/blog/${slug}/`);
    console.log(`Detected ${urls.length} changed blog URL(s):`);
    urls.forEach((u) => console.log(`  - ${u}`));
  }

  // Always include the sitemap itself so crawlers see the updated <lastmod>.
  urls.push(`${SITE}/sitemap-index.xml`);

  console.log('Waiting for URLs to go live on Cloudflare Pages…');
  await waitForUrls(urls.filter((u) => !u.endsWith('/sitemap-index.xml')));

  console.log('Submitting to IndexNow…');
  await submitIndexNow(urls);
  console.log('Done.');
}

main().catch((err) => {
  console.error('notify-indexnow failed:', err);
  // Exit 0 so a failed notification never blocks the workflow run.
  process.exit(0);
});
