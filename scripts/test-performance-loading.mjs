import test from 'node:test';
import assert from 'node:assert/strict';
import { initHeroVideo } from '../src/lib/hero-video.mjs';
import { initBooking } from '../src/lib/booking.mjs';

function node() {
  const events = {}; const classes = new Set(); const attrs = {};
  return { events, dataset:{}, hidden:true, textContent:'', disabled:false,
    addEventListener:(type,fn)=>events[type]=fn,
    classList:{remove:c=>classes.delete(c),toggle:(c,on)=>on?classes.add(c):classes.delete(c)},
    getAttribute:key=>attrs[key]||null,setAttribute:(key,v)=>attrs[key]=v,removeAttribute:key=>delete attrs[key],
    set src(v){attrs.src=v;},get src(){return attrs.src;},load(){},plays:0,pauses:0,
    async play(){this.plays++;},pause(){this.pauses++;},remove(){this.removed=true;},
  };
}
function hero({mobile=false,reduced=false,saveData=false,ready=true}={}) {
  const videos=Array.from({length:5},(_,i)=>Object.assign(node(),{dataset:{src:'/video-'+i+'.mp4'}}));
  const button=node(),doc=Object.assign(node(),{visibilityState:'visible',readyState:ready?'complete':'loading'}),media=Object.assign(node(),{matches:mobile}),motion=Object.assign(node(),{matches:reduced});
  let observe;
  const env=Object.assign(node(),{navigator:{connection:{saveData}},matchMedia:q=>q.includes('reduced')?motion:media,IntersectionObserver:class {constructor(fn){observe=fn;}observe(){}}});
  const root={ownerDocument:doc,querySelectorAll:()=>videos,querySelector:()=>button};
  initHeroVideo(root,env);
  return {videos,button,doc,media,motion,env,show:()=>observe([{isIntersecting:true}]),hide:()=>observe([{isIntersecting:false}])};
}
for (const config of [{mobile:true},{reduced:true},{saveData:true}]) test('video sources stay unassigned for '+JSON.stringify(config),async()=>{
  const h=hero(config);h.show();await Promise.resolve();assert.ok(h.videos.every(v=>!v.src));assert.equal(h.button.hidden,true);
});
test('desktop loads one clip when visible and assigns the next only after the current clip ends',async()=>{
  const h=hero();assert.ok(h.videos.every(v=>!v.src));h.show();await Promise.resolve();
  assert.equal(h.videos.filter(v=>v.src).length,1);assert.equal(h.button.hidden,false);
  h.videos[0].events.ended();await Promise.resolve();assert.equal(h.videos.filter(v=>v.src).length,2);assert.equal(h.videos[1].plays,1);
});
test('offscreen and hidden documents pause playback without loading later clips',async()=>{
  const h=hero();h.show();await Promise.resolve();h.hide();h.videos[0].events.ended();
  h.doc.visibilityState='hidden';h.doc.events.visibilitychange();assert.equal(h.videos.filter(v=>v.src).length,1);assert.ok(h.videos[0].pauses>0);
});
test('manual pause survives document visibility changes',async()=>{
  const h=hero();h.show();await Promise.resolve();h.button.events.click();const played=h.videos[0].plays;
  h.doc.events.visibilitychange();await Promise.resolve();assert.equal(h.videos[0].plays,played);assert.equal(h.button.textContent,'Play video');
});
test('desktop resize to mobile releases assigned video sources',async()=>{
  const h=hero();h.show();await Promise.resolve();h.media.matches=true;h.media.events.change();assert.ok(h.videos.every(v=>!v.src));assert.equal(h.button.hidden,true);
});
test('video request waits for the page load event',async()=>{
  const h=hero({ready:false});h.show();assert.ok(h.videos.every(v=>!v.src));h.env.events.load();await Promise.resolve();assert.equal(h.videos.filter(v=>v.src).length,1);
});
function booking() {
  const button=node(),status=node(),facade=node(),scripts=[],children=[],events=[];
  const doc={createElement:tag=>Object.assign(node(),{tag}),body:{appendChild:s=>scripts.push(s)},dispatchEvent:e=>events.push(e.type)};
  const slot={ownerDocument:doc,dataset:{path:'cposeyrealestate/30-minute-meeting'},querySelector:s=>s.includes('load-booking')?button:s.includes('status')?status:facade,appendChild:s=>children.push(s)};
  initBooking(slot);return {button,status,facade,scripts,children,events};
}
test('booking has no third-party script until intent and ignores double clicks',()=>{
  const b=booking();assert.equal(b.scripts.length,0);b.button.events.click();b.button.events.click();assert.equal(b.scripts.length,1);assert.equal(b.children[0].dataset.path,'cposeyrealestate/30-minute-meeting');assert.deepEqual(b.events,['cpre:booking-opened']);
});
test('failed scheduler script permits retry and retains the fallback facade',()=>{
  const b=booking();b.button.events.click();b.scripts[0].events.error();assert.equal(b.button.disabled,false);assert.match(b.status.textContent,/could not load/);b.button.events.click();assert.equal(b.scripts.length,2);
});
test('successful scheduler script hides the initial prompt',()=>{
  const b=booking();b.button.events.click();b.scripts[0].events.load();assert.equal(b.facade.hidden,true);
});
