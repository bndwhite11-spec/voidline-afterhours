// Per-file gzip-6 transfer estimates. These omit HTTP headers, API payloads,
// browser painting and storage. Read-only; does not create ownership records.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
import {execFileSync} from 'node:child_process';
import {JSDOM} from 'jsdom';
const root=fileURLToPath(new URL('../',import.meta.url)),readLocal=file=>fs.readFileSync(path.join(root,'dist',file));
const baseline='c19286f8d18f1ea7b73ae900f49b68f5807f9081';
const readOld=file=>execFileSync('git',['show',baseline+':dist/'+file],{cwd:root,maxBuffer:12*1024*1024});
const sizes=bytes=>({raw:bytes.length,gzip6:gzipSync(bytes,{level:6}).length});
function sum(list){return list.reduce((a,b)=>({raw:a.raw+b.raw,gzip6:a.gzip6+b.gzip6}),{raw:0,gzip6:0});}
function assets(read){
 const dom=new JSDOM(read('index.html').toString()),doc=dom.window.document,select='script[src], link[rel="stylesheet"]';
 try{
  function measure(elements){const names=[...new Set(elements.map(n=>(n.getAttribute('src')||n.getAttribute('href')).replace(/^\//,'')))];return {requests:names.length,...sum(names.map(name=>sizes(read(name))))};}
  return {parser:measure([...doc.querySelectorAll(select)]),collection:measure([...doc.querySelectorAll('template[data-feature="collection"]')].flatMap(t=>[...t.content.querySelectorAll(select)]))};
 }finally{dom.window.close();}
}
const record={measurement:'Local files; per-response Gzip level 6; no headers, HTML or account API traffic.',baseline:assets(readOld),current:assets(readLocal),illustrationRuntime:sizes(readLocal('collectible-art.js')),models:[]};
for(const item of JSON.parse(readLocal('art/v4/manifest.json')).items.filter(i=>i.assetKind==='layered-svg')){
 const measured=Object.fromEntries(Object.entries(item.variants).map(([variant,v])=>[variant,sizes(readLocal(v.url))]));
 record.models.push({id:item.id,artRevision:item.artRevision,poster:measured.card,detailWithMotion:measured.detail,miniature:measured.mini,
   selectedModelCold:sum([record.illustrationRuntime,measured.card,measured.detail]),selectedModelAfterRuntime:sum([measured.card,measured.detail])});
}
record.budgetExceptions=record.models.filter(m=>m.poster.gzip6>80000||m.detailWithMotion.gzip6>300000).map(m=>m.id);
record.warmReplay='0 GETs in the exercised recently-used model case. Each mounted scene stores its own decoded tracks. The replay fixture uses the actual compiled client, local immutable responses, jsdom, and controlled WAAPI.';
console.log(JSON.stringify(record,null,2));
