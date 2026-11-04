export const VIDEO_ORIGIN = 'https://cposeyrealestate.com';
export const watchPath = video => `/videos/${video.slug}/`;
export const playerUrl = video => `https://www.youtube.com/embed/${video.videoId}`;
export const thumbnailUrl = video => `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;
export function xmlEscape(value) { return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[char]); }
export function videoSitemap(videos) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">'+videos.map(video=>`<url><loc>${VIDEO_ORIGIN}${watchPath(video)}</loc><video:video><video:thumbnail_loc>${xmlEscape(thumbnailUrl(video))}</video:thumbnail_loc><video:title>${xmlEscape(video.youtubeTitle)}</video:title><video:description>${xmlEscape(video.description)}</video:description><video:player_loc>${xmlEscape(playerUrl(video))}</video:player_loc><video:duration>${video.durationSeconds}</video:duration><video:publication_date>${xmlEscape(video.uploadDate)}</video:publication_date></video:video></url>`).join('')+'</urlset>\n';
}
