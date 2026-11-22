'use strict';
// Source-region geometry and unchanged image provenance, not rasterized motion.
const assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
(async()=>{
 const {artCatalog,studioCatalog,published32ArtSVG,artSVG}=await import('../src/art/catalog.mjs'),{assertSafeWebSVG}=await import('../src/art/web-art.mjs'),cassette=studioCatalog['gift-cassette'],motion=cassette.motion;
 assert.equal(cassette.revealPreset,'cassette-reel-check');assert.equal(motion.duration,1540);assert.equal(motion.layers.length,2,'only the two reels animate');assert.deepEqual(motion.layers.map(x=>x.name),['web-panel-1','web-panel-2']);
 assert.equal(cassette.sourceArt.sha256,'170f8d78897a1c9f54af160e1be598d047d721c1f0b7821540b061d85b6a474a','credited artwork bytes stay unchanged');
 const svg=published32ArtSVG('gift-cassette','detail');assertSafeWebSVG(svg,cassette.sourceArt);const dom=new JSDOM(svg,{contentType:'image/svg+xml'}),doc=dom.window.document;
 assert.equal(doc.querySelector('parsererror'),null);assert.equal(doc.querySelectorAll('image').length,1,'one source raster, reused locally');assert.equal(doc.querySelectorAll('script,animate,set').length,0,'static rest has no autoplay');assert.equal(doc.querySelectorAll('[data-part]').length,3,'complete static case plus two reel regions');
 const base=doc.querySelector('[data-part="web-panel-0"]');assert.ok(base);assert.equal(base.hasAttribute('transform'),false);assert.equal(base.hasAttribute('opacity'),false);assert.ok(!motion.layers.some(x=>x.name==='web-panel-0'),'the case does not fold, float or blink');
 const baseClip=base.querySelector('use').getAttribute('clip-path').slice(5,-1),cutouts=doc.getElementById(baseClip).querySelector('path');assert.equal(cutouts.getAttribute('clip-rule'),'evenodd');assert.equal((cutouts.getAttribute('d').match(/a/g)||[]).length,4,'both reel regions are removed from the base to prevent stationary duplicate teeth through transparent centers');
 const clips=[...doc.querySelectorAll('clipPath circle')];assert.equal(clips.length,2);for(let i=0;i<clips.length;i++){const circle=clips[i],layer=motion.layers[i],cx=+circle.getAttribute('cx'),cy=+circle.getAttribute('cy');assert.deepEqual(layer.origin,[cx,cy],'reel rotates about its source center');assert.equal(+circle.getAttribute('r'),13.76);assert.ok(cx>28&&cx<228&&cy>28&&cy<228);assert.deepEqual(layer.frames[0],{at:0});assert.deepEqual(layer.frames.at(-1),{at:1},'source resting pose is restored');assert.ok(layer.frames.some(frame=>frame.rotate>60));assert.ok(layer.frames.some(frame=>frame.rotate<0));assert.ok(layer.frames.every(frame=>Object.keys(frame).every(key=>['at','rotate'].includes(key))),'no scale/opacity flash or broad effect');}
 assert.notDeepEqual(motion.layers[0].frames,motion.layers[1].frames,'reels have distinct advances and timing');assert.equal(studioCatalog['gift-cup'].revealPreset,'turn','historical image choreography stays available');dom.window.close();
 const {readFileSync}=require('node:fs'),path=require('node:path');
 const registry=JSON.parse(readFileSync(path.join(__dirname,'../dist/art/v4/manifest.json'),'utf8'));
 const current=artCatalog['gift-cassette'],publicDetail=registry.items.find(item=>item.id==='gift-cassette').variants.detail.url;
 const publicSvg=readFileSync(path.join(__dirname,'../dist',publicDetail),'utf8');
 assert.equal(artSVG('gift-cassette','detail'),publicSvg);
 const next=new JSDOM(publicSvg,{contentType:'image/svg+xml'});
 try {
  const drawing=next.window.document;
  assert.equal(current.assetKind,'layered-svg');
  assert.equal(drawing.querySelector('image,script,animate,set'),null);
  assert.deepEqual(current.motion.layers.map(track=>track.name),['reel-left','reel-right']);
  assert.notDeepEqual(...current.motion.layers.map(track=>track.frames));
  for(const track of current.motion.layers){
   assert(drawing.querySelector('[data-part="'+track.name+'"] path'));
   assert.deepEqual(track.frames[0],{at:0});
   assert.deepEqual(track.frames.at(-1),{at:1});
   assert(track.frames.some(frame=>Math.abs(frame.rotate||0)>30));
  }
 }finally{next.window.close();}
 console.log('PASS archived cassette reel geometry and current named, hand-drawn independent reels. Both return to rest.');
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
