import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import { finished } from 'stream/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const IMAGES_DIR = path.join(PROJECT_ROOT, 'public', 'images', 'blog');
const DATA_DIR = path.join(PROJECT_ROOT, 'src', 'data');

const WP_API = 'https://cposeyrealestateblog.com/wp-json/wp/v2';

// Calculate date 30 days ago
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const afterDate = thirtyDaysAgo.toISOString();

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

async function downloadFile(url, filepath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading ${url}`);
  const fileStream = fs.createWriteStream(filepath);
  await finished(Readable.fromWeb(res.body).pipe(fileStream));
}

function stripHTML(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&#8217;/g, "'").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"').replace(/&#8211;/g, '–').replace(/&#8212;/g, '—').replace(/&amp;/g, '&').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

async function fetchCategories() {
  try {
    const cats = await fetchJSON(`${WP_API}/categories?per_page=100`);
    const map = {};
    for (const cat of cats) {
      map[cat.id] = cat.name;
    }
    return map;
  } catch (e) {
    console.warn('Could not fetch categories:', e.message);
    return {};
  }
}

async function main() {
  console.log('Fetching blog posts from WordPress...');
  console.log(`After date: ${afterDate}`);

  // Fetch categories
  const categoryMap = await fetchCategories();

  // Fetch posts
  const posts = await fetchJSON(
    `${WP_API}/posts?per_page=30&orderby=date&order=desc&after=${afterDate}`
  );

  console.log(`Found ${posts.length} posts in the last 30 days`);

  const blogPosts = [];

  for (const post of posts) {
    console.log(`Processing: ${post.title.rendered}`);

    let featuredImage = '/images/blog/default.jpg';

    // Fetch featured image
    if (post.featured_media && post.featured_media > 0) {
      try {
        const media = await fetchJSON(`${WP_API}/media/${post.featured_media}`);
        const imageUrl = media.source_url;
        const ext = path.extname(new URL(imageUrl).pathname) || '.jpg';
        const filename = `${post.slug}${ext}`;
        const filepath = path.join(IMAGES_DIR, filename);

        if (!fs.existsSync(filepath)) {
          console.log(`  Downloading image: ${filename}`);
          await downloadFile(imageUrl, filepath);
        } else {
          console.log(`  Image already exists: ${filename}`);
        }

        featuredImage = `/images/blog/${filename}`;
      } catch (e) {
        console.warn(`  Could not fetch featured image: ${e.message}`);
      }
    }

    // Get category name
    const categoryId = post.categories?.[0];
    const category = categoryMap[categoryId] || 'Uncategorized';

    blogPosts.push({
      title: stripHTML(post.title.rendered),
      slug: post.slug,
      date: formatDate(post.date),
      dateRaw: post.date,
      excerpt: stripHTML(post.excerpt.rendered),
      content: post.content.rendered,
      category,
      featuredImage,
    });
  }

  // Write JSON data file
  const outputPath = path.join(DATA_DIR, 'blog-posts.json');
  fs.writeFileSync(outputPath, JSON.stringify(blogPosts, null, 2));
  console.log(`\nWrote ${blogPosts.length} posts to ${outputPath}`);
  console.log('Done!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
