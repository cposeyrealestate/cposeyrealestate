#!/usr/bin/env python3
"""One-off: scan every post in src/data/blog-posts.json and, where an
H2 or H3 headline phrased as a question is followed by paragraph text,
capture the pair as an FAQ item on that post.

Rules:
- Headline counts as a question if it ends with "?"
- The accepted answer is the first ~2 paragraphs of text that follow
  (stop at the next heading, blockquote, or list)
- Skip trivially short answers (< 80 chars)
- Skip posts that already have faqItems set
- Only writes posts that had at least 2 FAQ pairs extracted (1 feels
  thin for FAQPage schema)

Safe to re-run — idempotent when posts already have faqItems.
"""
import json
import re
from html.parser import HTMLParser
from pathlib import Path

DATA_PATH = Path('src/data/blog-posts.json')
MIN_ANSWER_LEN = 80
MIN_FAQ_PAIRS = 2


class QAExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.pairs = []
        self.state = 'idle'  # idle | collect_q | collect_a
        self.current_q: list[str] = []
        self.current_a: list[str] = []
        self.heading_level: int | None = None

    def handle_starttag(self, tag, attrs):
        if tag in ('h2', 'h3'):
            # Save any in-progress answer
            self._flush_if_ready()
            self.current_q = []
            self.current_a = []
            self.heading_level = int(tag[1])
            self.state = 'collect_q'
        elif tag == 'p' and self.state in ('after_q', 'collect_a'):
            self.state = 'collect_a'

    def handle_endtag(self, tag):
        if tag in ('h2', 'h3') and self.state == 'collect_q':
            q = ''.join(self.current_q).strip()
            if q.endswith('?') and 6 < len(q) < 250:
                self.state = 'after_q'
            else:
                self.state = 'idle'
                self.current_q = []

    def handle_data(self, data):
        if self.state == 'collect_q':
            self.current_q.append(data)
        elif self.state in ('after_q', 'collect_a'):
            self.current_a.append(data)

    def _flush_if_ready(self):
        if self.state in ('after_q', 'collect_a'):
            q = ''.join(self.current_q).strip()
            a = ' '.join(''.join(self.current_a).split()).strip()
            # Keep only the first ~2 sentences worth for a clean answer
            # — FAQPage schema wants concise, not an entire subsection.
            sentences = re.split(r'(?<=[.!?])\s+', a)
            a = ' '.join(sentences[:3]).strip()
            if q and a and len(a) >= MIN_ANSWER_LEN:
                self.pairs.append({'q': q, 'a': a[:500]})
        self.state = 'idle'

    def close(self):
        self._flush_if_ready()
        super().close()


def extract_faqs(html: str) -> list[dict]:
    p = QAExtractor()
    try:
        p.feed(html)
        p.close()
    except Exception:
        return []
    # Dedupe by question (case-insensitive)
    seen = set()
    out = []
    for pair in p.pairs:
        key = pair['q'].lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(pair)
    return out


def main() -> int:
    posts = json.loads(DATA_PATH.read_text(encoding='utf-8'))

    touched = 0
    skipped_existing = 0
    skipped_too_few = 0

    for post in posts:
        if 'faqItems' in post and isinstance(post['faqItems'], list) and len(post['faqItems']) > 0:
            skipped_existing += 1
            continue
        faqs = extract_faqs(post.get('content', ''))
        if len(faqs) < MIN_FAQ_PAIRS:
            skipped_too_few += 1
            continue
        post['faqItems'] = faqs
        touched += 1
        print(f"  + {len(faqs)} FAQs: {post['slug']}")

    DATA_PATH.write_text(
        json.dumps(posts, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8',
    )
    print(f"\nTagged {touched} post(s) with faqItems. "
          f"Skipped {skipped_existing} already-tagged, "
          f"{skipped_too_few} with < {MIN_FAQ_PAIRS} Q&A pairs.")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
