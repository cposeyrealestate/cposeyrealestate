type ListingPost = { dateRaw?: string; dateModified?: string; date: string };

// Use calendar dates consistently, including legacy imported dates with no offset.
// Explicit-offset updates are formatted in the site's local timezone.
function localDay(value?: string): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}/.test(value) || Number.isNaN(Date.parse(value))) return '';
  if (!/(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find(p => p.type === type)?.value || '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function listingDay(post: ListingPost): string {
  return [localDay(post.dateRaw), localDay(post.dateModified)].sort().at(-1) || '';
}

export function recentPosts<T extends ListingPost>(posts: readonly T[]): T[] {
  return [...posts].sort((a, b) =>
    listingDay(b).localeCompare(listingDay(a)) ||
    (b.dateRaw || '').localeCompare(a.dateRaw || '')
  );
}

export function blogCardDate(post: ListingPost): string {
  if (localDay(post.dateModified) > localDay(post.dateRaw)) {
    return `Updated ${new Date(post.dateModified!).toLocaleDateString('en-US', {
      timeZone: 'America/Chicago', month: 'long', day: 'numeric', year: 'numeric',
    })}`;
  }
  return `Published ${post.date}`;
}
