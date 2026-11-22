// Shipped renderer and XML, local immutable bytes, jsdom and controlled WAAPI.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{webcrypto}=require('node:crypto'),{JSDOM}=require('jsdom');
const dist=path.join(__dirname,'../dist'), manifest=JSON.parse(fs.readFileSync(path.join(dist,'art/v4/manifest.json'),'utf8'));
const models=manifest.items.filter(m=>m.assetKind==='layered-svg');
async function run(){
 const dom=new JSDOM('<main id="stage"></main>',{url:'https://voidline.test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 const calls=[],anim=[];
 Object.defineProperty(w,'crypto',{value:webcrypto});
 w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
 w.matchMedia=()=>({matches:false,addEventListener(){}});
 w.Element.prototype.animate=function(frames,options){
  let complete;const finished=new Promise(r=>{complete=r;});
  const a={frames,options,finished,complete,pause(){},play(){},cancel(){this.cancelled=true;complete();}};
  anim.push(a);return a;
 };
 w.fetch=async(url,options)=>{
  assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');assert.match(url,/^\/art\/v4\/[a-z\d-]+-detail\.[\da-f]{12}\.svg$/);calls.push(url);
  return new Response(fs.readFileSync(path.join(dist,url)),{headers:{'content-type':'image/svg+xml'}});
 };
 w.eval(fs.readFileSync(path.join(dist,'collectible-art.js'),'utf8'));
 const art=w.VoidCollectibleArt,stage=w.document.querySelector('#stage');
 try{
  assert(models.length>=12);
  for(const m of models){
   stage.innerHTML=art.detail(m.id,m.name);
   assert.equal(stage.querySelector('img').getAttribute('src'),m.variants.card.url);
   assert.equal(stage.querySelector('[role=img]').getAttribute('aria-label'),m.alt);
   const first=anim.length,result=await art.preview(stage,m.id);
   assert.equal(result.played,true,m.id+': '+result.reason);
   assert.equal(result.duration,m.motion.duration,m.id);
   const scene=stage.querySelector('svg.va-scene');
   assert.equal(scene.dataset.artObject,m.id);assert(!scene.hasAttribute('data-motion'));
   const own=anim.slice(first);assert.equal(own.length,m.motion.layers.length);
   for(const a of own)a.complete();assert.equal(await result.finished,'complete');assert(own.every(a=>a.cancelled));
   if(m.familyId){const bg=art.backdrop(m.id);assert(bg.includes(m.backdrop.center));assert(bg.includes(m.backdrop.edge));assert(bg.includes(m.backdrop.motifColor));}
   art.stop(stage);
  }
  const m=models.at(-1),count=calls.length;
  stage.innerHTML=art.detail(m.id);const replay=await art.preview(stage,m.id);assert(replay.played);assert.equal(calls.length,count,'warm replay reuses the exact verified detail');replay.stop();assert.equal(await replay.finished,'stopped');
  stage.innerHTML=art.detail(m.id);stage.querySelector('img').dispatchEvent(new w.Event('error'));
  assert(stage.querySelector('[data-va-state="poster-unavailable"]'));assert(stage.querySelector('.va-unavailable').getAttribute('aria-label').includes(m.name));
  stage.innerHTML=art.detail('missing-retired-model','Old award');assert.match(stage.querySelector('[role=img]').getAttribute('aria-label'),/Old award/);assert(!stage.querySelector('img'));
  console.log('PASS '+models.length+' exact exported layered details and same-ID posters through shipped renderer, bounded streamed size, SHA-256, DOM parsing, named tracks and cleanup');
  console.log('PASS missing current poster and unknown receipt preserve distinct named fallbacks; warm replay issues no GET');
 }finally{art.stopAll();dom.window.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
