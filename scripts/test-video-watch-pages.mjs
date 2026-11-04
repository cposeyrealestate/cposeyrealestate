import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { videoSitemap, xmlEscape, watchPath, playerUrl, thumbnailUrl } from '../src/lib/video-sitemap.mjs';
const videos=JSON.parse(readFileSync(new URL('../src/data/watch-videos.json',import.meta.url),'utf8'));
test('video sitemap escapes publisher text without changing player identities',()=>{
  const example={...videos[0],youtubeTitle:'A & B <tour> "home"',description:"Cody's tour & comparison"};
  const xml=videoSitemap([example]);
  assert.match(xml,/<video:title>A &amp; B &lt;tour&gt; &quot;home&quot;<\/video:title>/);
  assert.ok(xml.includes('<video:player_loc>'+playerUrl(example)+'</video:player_loc>'));
  assert.equal(xmlEscape("'"),'&apos;');
});
test('each video has one unique watch URL and verified-format metadata',()=>{
  assert.equal(new Set(videos.map(watchPath)).size,videos.length);
  assert.equal(new Set(videos.map(v=>v.videoId)).size,videos.length);
  for(const video of videos){
    assert.match(video.videoId,/^[A-Za-z0-9_-]{11}$/);
    assert.ok(Number.isFinite(Date.parse(video.uploadDate)));
    assert.match(video.duration,/^PT\d+M\d+S$/);
    const [,minutes,seconds]=/^PT(\d+)M(\d+)S$/.exec(video.duration);
    assert.equal(Number(minutes)*60+Number(seconds),video.durationSeconds);
    assert.ok(video.transcript.join(' ').split(/\s+/).length>1000);
    assert.ok(videoSitemap([video]).includes(thumbnailUrl(video)));
  }
});
test('video sitemap lists only watch pages, not guide embeds or homepage backgrounds',()=>{
  const xml=videoSitemap(videos);
  assert.equal((xml.match(/<loc>/g)||[]).length,2);
  for(const video of videos)assert.ok(xml.includes('<loc>https://cposeyrealestate.com'+watchPath(video)+'</loc>'));
  assert.ok(!xml.includes('hero-'));
  assert.ok(!xml.includes('<loc>https://cposeyrealestate.com/bulverde/</loc>'));
});
