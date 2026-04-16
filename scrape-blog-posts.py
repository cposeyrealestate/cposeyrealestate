#!/usr/bin/env python3
"""One-off scraper: pull new posts from cposeyrealestateblog.com and merge into src/data/blog-posts.json.

Targets posts from 2026-04-09 forward. Safe to re-run — skips slugs that already exist.
"""
import json
import re
import subprocess
import sys
import time
from datetime import datetime
from bs4 import BeautifulSoup

POST_URLS = [
    "https://cposeyrealestateblog.com/2026-04-09-texas-veteran-property-tax-exemption-plan/",
    "https://cposeyrealestateblog.com/2026-04-10-lifestyle-change-new-braunfels-transition-strategy/",
    "https://cposeyrealestateblog.com/2026-04-11-new-braunfels-market-update-april-2026/",
    "https://cposeyrealestateblog.com/2026-04-13-selling-strategically-seller-gameplan/",
    "https://cposeyrealestateblog.com/2026-04-15-buyers-corner-hill-country-home-buying-checklist/",
    "https://cposeyrealestateblog.com/2026-04-16-texas-va-home-buying-guide/",
]

SITE_SUFFIX_PATTERNS = [
    re.compile(r"\s*[-–]\s*New Braunfels.*$", re.IGNORECASE),
    re.compile(r"\s*\|\s*Cody Posey.*$", re.IGNORECASE),
]

def fetch(url: str, retries: int = 3) -> str:
    # curl gets past the bot-guard that blocks python urllib
    ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
    for attempt in range(retries):
        try:
            result = subprocess.run(
                ["curl", "-sL", "--max-time", "30", "-A", ua, url],
                capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=35,
            )
            if result.returncode == 0 and len(result.stdout) > 5000:
                return result.stdout
            time.sleep(2 ** attempt)
        except subprocess.TimeoutExpired:
            time.sleep(2 ** attempt)
    raise RuntimeError(f"Failed to fetch {url} after {retries} attempts")

def clean_title(raw: str) -> str:
    for pat in SITE_SUFFIX_PATTERNS:
        raw = pat.sub("", raw)
    return raw.strip()

def format_date(iso: str) -> str:
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return dt.strftime("%B %-d, %Y") if sys.platform != "win32" else dt.strftime("%B %#d, %Y")

def extract_post(url: str) -> dict:
    html = fetch(url)
    soup = BeautifulSoup(html, "lxml")

    def meta(prop: str) -> str | None:
        tag = soup.find("meta", property=prop) or soup.find("meta", attrs={"name": prop})
        return tag.get("content") if tag else None

    og_title = meta("og:title") or (soup.title.get_text() if soup.title else "")
    title = clean_title(og_title)
    excerpt = meta("og:description") or meta("description") or ""
    featured_image = meta("og:image") or ""
    published = meta("article:published_time") or ""

    # Slug: trailing path segment
    slug = url.rstrip("/").rsplit("/", 1)[-1]

    # Category: first rel=category link
    cat_link = soup.find("a", rel=lambda v: v and "category" in v)
    category = cat_link.get_text(strip=True) if cat_link else "Blog"

    # Content: the .entry-content div
    entry = soup.find("div", class_=lambda c: c and "entry-content" in c.split())
    if entry:
        # Strip AIOSEO schema blocks and sharing widgets if present
        for sel in [".addtoany_share_save_container", ".jp-relatedposts", "script"]:
            for bad in entry.select(sel):
                bad.decompose()
        content_html = entry.decode_contents().strip()
    else:
        content_html = ""

    date_raw = published.split("+")[0] if published else ""
    date_display = format_date(published) if published else ""

    return {
        "title": title,
        "slug": slug,
        "date": date_display,
        "dateRaw": date_raw,
        "excerpt": excerpt,
        "content": content_html,
        "category": category,
        "featuredImage": featured_image,
    }

def main() -> int:
    data_path = "src/data/blog-posts.json"
    with open(data_path, "r", encoding="utf-8") as f:
        existing = json.load(f)
    existing_slugs = {p["slug"] for p in existing}

    added = []
    for i, url in enumerate(POST_URLS):
        slug = url.rstrip("/").rsplit("/", 1)[-1]
        if slug in existing_slugs:
            print(f"skip (already exists): {slug}")
            continue
        if i > 0:
            time.sleep(1.5)  # be polite — avoid WP rate-limiter
        print(f"fetching: {url}")
        try:
            post = extract_post(url)
        except Exception as exc:  # noqa: BLE001
            print(f"  !! failed to extract: {exc}")
            continue
        if not post["content"]:
            print(f"  !! no content extracted, skipping: {slug}")
            continue
        added.append(post)
        print(f"  + {post['title']} ({len(post['content'])} chars)")

    if not added:
        print("Nothing to add.")
        return 0

    merged = existing + added
    # Sort by dateRaw ascending (matches existing ordering)
    merged.sort(key=lambda p: p.get("dateRaw", ""))
    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    print(f"Added {len(added)} post(s). Total posts now: {len(merged)}.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
