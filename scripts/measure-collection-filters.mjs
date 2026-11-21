// Same account, renderer, 81 browsable catalog entries and query sequence in both runs.
// jsdom includes DOM parsing and event handling. It does not paint or decode images.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {JSDOM} from 'jsdom';
import {COSMETICS} from '../worker/cosmetics.mjs';
const root=new URL('../',import.meta.url);
const ref=process.argv[2]||'985e4400c4d1db3b377148a55969f5558a67dabe';
if(!/^[0-9a-f]{7,40}$/.test(ref))throw Error('Supply the baseline commit SHA.');
const earlier=execFileSync('git',['show',ref+':dist/cosmetics.js'],{cwd:root,encoding:'utf8'});
const current=readFileSync(new URL('dist/cosmetics.js',root),'utf8');
const art=readFileSync(new URL('dist/collectible-art.js',root),'utf8');
const queries=['r','ro','ros','rose','','ch','chu','chud',''];
async function measure(source){
 const dom=new JSDOM('<!doctype html><body><div id="home-dialog"></div></body>',{url:'https://fixture.invalid',runScripts:'outside-only'});
 const w=dom.window,d=w.document;w.eval(art);
 const account={id:'fixture'},state={account,generation:0,dialogGeneration:0,view:'chats'};let extension;
 w.VoidHome={state,guard:()=>()=>true,esc(value){const e=d.createElement('span');e.textContent=value??'';return e.innerHTML.replaceAll('"','&quot;');},
  registerExtension(value){extension=value;value.init(this);},request(path){
   if(path==='/api/cosmetics/catalog')return Promise.resolve({items:COSMETICS});
   if(path==='/api/cosmetics/inventory')return Promise.resolve({owned:[]});
   throw Error('Unexpected fixture request '+path);
  },render(){},showDialog(_name,_description,html){d.getElementById('home-dialog').innerHTML=html;return ++state.dialogGeneration;}
 };
 w.eval(source);await extension.onAccount();await w.VoidCosmetics.collection();
 const input=d.getElementById('vc-design-search'),grid=d.getElementById('vc-design-grid');
 const originals=new Set(grid.querySelectorAll('img')),created=new Set(),samples=[];
 let finalCount=0;
 for(let run=0;run<6;run++){
  const start=performance.now();
  for(const q of queries){input.value=q;input.dispatchEvent(new w.Event('input',{bubbles:true}));
   for(const image of grid.querySelectorAll('img'))if(!originals.has(image))created.add(image);
  }
  if(run)samples.push(performance.now()-start);
  finalCount=grid.children.length;
 }
 dom.window.close();
 samples.sort((a,b)=>a-b);
 return {initialCards:originals.size,finalCards:finalCount,additionalPosterNodes:created.size,medianSequenceMs:Number(samples[2].toFixed(1))};
}
console.log(JSON.stringify({node:process.version,queries,fixture:'jsdom; one warm-up plus five timed sequences',baseline:await measure(earlier),current:await measure(current)},null,2));
