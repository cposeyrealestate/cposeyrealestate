import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { VIDEO_ORIGIN, watchPath, playerUrl, thumbnailUrl, xmlEscape } from '../src/lib/video-sitemap.mjs';
const root='dist/client';
const videos=JSON.parse(readFileSync('src/data/watch-videos.json','utf8'));
const sitemap=readFileSync(root+'/sitemap-videos.xml','utf8');
assert.ok(readFileSync(root+'/sitemap-index.xml','utf8').includes(VIDEO_ORIGIN+'/sitemap-videos.xml'));
assert.ok(readFileSync('public/robots.txt','utf8').includes('Sitemap: '+VIDEO_ORIGIN+'/sitemap-videos.xml'));
for(const video of videos){
  const url=VIDEO_ORIGIN+watchPath(video),html=readFileSync(root+watchPath(video)+'index.html','utf8');
  assert.equal((html.match(/<h1\b/g)||[]).length,1,url+': single H1');
  const frames=[...html.matchAll(/<iframe\b([^>]*)>/g)];
  assert.equal(frames.length,1,url+': single primary player');
  assert.ok(frames[0][1].includes('src="'+playerUrl(video)+'"'));
  assert.ok(frames[0][1].includes('loading="eager"'));
  assert.ok(html.indexOf('<iframe')<html.indexOf('id="about-video"'));
  assert.ok(html.indexOf('<iframe')<html.indexOf('id="transcript"'));
  assert.ok(!html.includes('id="signupPopup"'),url+': no delayed signup overlay');
  assert.ok(html.includes('rel="canonical" href="'+url+'"'));
  const schema=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m=>[JSON.parse(m[1])].flat());
  const objects=schema.filter(s=>s['@type']==='VideoObject');assert.equal(objects.length,1);
  const object=objects[0],page=schema.find(s=>s['@id']===url+'#webpage');
  assert.equal(object.embedUrl,playerUrl(video));assert.equal(object.thumbnailUrl,thumbnailUrl(video));assert.equal(object.uploadDate,video.uploadDate);assert.equal(object.duration,video.duration);assert.equal(page.mainEntity['@id'],object['@id']);
  assert.ok(html.includes(video.transcript[0].slice(0,50).replaceAll("'",'&#39;'))||html.includes(video.transcript[0].slice(0,50)),url+': transcript in initial HTML');
  assert.ok(sitemap.includes('<loc>'+url+'</loc>'));assert.ok(sitemap.includes('<video:player_loc>'+playerUrl(video)+'</video:player_loc>'));assert.ok(sitemap.includes('<video:title>'+xmlEscape(video.youtubeTitle)+'</video:title>'));
  assert.ok(readFileSync(root+'/sitemap-0.xml','utf8').includes(url));
}
console.log('Verified two dedicated watch pages, primary players, transcripts, video metadata, and sitemap discovery.');
