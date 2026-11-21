// Usage: node scripts/measure-entry.mjs [--revision <git commit>]
// Counts parser-initiated app scripts/styles. Optional feature templates, icons,
// HTML, API traffic, HTTP headers and the user's browser cache are separate.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync, brotliCompressSync, constants} from 'node:zlib';
import {JSDOM} from 'jsdom';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const revision=process.argv[2]==='--revision'?process.argv[3]:null;
if(process.argv.length !== (revision?4:2) || revision && !/^[a-f\d]{7,40}$/.test(revision))throw Error('Supply a Git commit with --revision, or measure the current checkout.');
function read(name){
  return revision ? execFileSync('git',['show',revision+':dist/'+name],{cwd:root,maxBuffer:12*1024*1024}) : readFileSync(join(root,'dist',name));
}
const page=new JSDOM(read('index.html').toString());
const doc=page.window.document, assets=new Map();
function count(element,stage){
  const kind=element.tagName==='SCRIPT'?'js':'css';
  const url=element.getAttribute(kind==='js'?'src':'href');
  const file=url.split(/[?#]/)[0].replace(/^\//,'');
  if(!/^[a-z0-9-]+\.(?:js|css)$/.test(file))throw Error('Unexpected entry asset: '+url);
  const bytes=read(file);
  assets.set(file,{file,stage,kind,bytes:bytes.length,gzip:gzipSync(bytes,{level:6}).length,
    brotli:brotliCompressSync(bytes,{params:{[constants.BROTLI_PARAM_QUALITY]:5}}).length});
}
const selector='script[src],link[rel="stylesheet"][href]';
for(const node of doc.querySelectorAll(selector))count(node,'entry');
for(const template of doc.querySelectorAll('template[data-feature]')){
  for(const node of template.content.querySelectorAll(selector))count(node,template.dataset.feature);
}
const stages={};
for(const {stage,kind,bytes,gzip,brotli} of assets.values()){
  stages[stage]??={};const sums=stages[stage][kind]??={requests:0,raw:0,gzip6:0,brotli5:0};
  sums.requests++;sums.raw+=bytes;sums.gzip6+=gzip;sums.brotli5+=brotli;
}
console.log(JSON.stringify({revision:revision||'working tree',stages,entryFiles:[...assets.values()].filter(x=>x.stage==='entry').map(x=>x.file)},null,2));
page.window.close();
