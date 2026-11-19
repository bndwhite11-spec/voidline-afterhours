// Actual jsdom XML parsing and maintained DOMPurify; not browser image rendering.
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {prepareProfileSvg} from '../src/profile-svg.mjs';
import {inspectImage} from '../src/media-validation.mjs';

const window=new JSDOM('').window,encode=value=>new TextEncoder().encode(value),decode=value=>new TextDecoder().decode(value);
const tests=[],test=(name,run)=>tests.push([name,run]);
const svg=(body,attributes='width="64" height="48"')=>`<svg xmlns="http://www.w3.org/2000/svg" ${attributes}>${body}</svg>`;
const prepare=source=>prepareProfileSvg(encode(source),{window});

test('static paths, shapes and text are sanitized into a standalone bounded native decoder source',()=>{
 const source=encode(svg('<g transform="translate(1 2)"><path d="M0 0H32V24Z" fill="#8cabf7"/><text x="4" y="12" font-family="Arial" font-size="8">VOID &amp; LINE</text></g>'));
 const original=source.slice(),result=prepareProfileSvg(source,{window});
 assert.equal(result.width,64);assert.equal(result.height,48);assert.equal(result.mime,'image/svg+xml');assert.equal(result.decoder,'native');assert.deepEqual(source,original);
 const output=decode(result.bytes),parsed=new window.DOMParser().parseFromString(output,'image/svg+xml');
 assert.equal(parsed.getElementsByTagName('parsererror').length,0);assert.equal(parsed.documentElement.namespaceURI,'http://www.w3.org/2000/svg');
 assert.equal(parsed.querySelector('path').getAttribute('d'),'M0 0H32V24Z');assert.equal(parsed.querySelector('text').textContent,'VOID & LINE');assert.equal(parsed.querySelector('g').getAttribute('transform'),'translate(1 2)');
 assert.throws(()=>inspectImage(result.bytes),/PNG|JPEG|supported/,'raw server image validation never accepts SVG');
});
test('viewBox and physical units produce explicit finite pixel dimensions without live DOM insertion',()=>{
 const absent=prepare('<svg viewBox="-4 -2 40 20"><ellipse cx="12" cy="8" rx="8" ry="4"/></svg>');assert.equal(absent.width,40);assert.equal(absent.height,20);
 const ratio=prepare(svg('<rect width="10" height="10"/>','width="120" viewBox="0 0 40 20"'));assert.equal(ratio.width,120);assert.equal(ratio.height,60);
 const units=prepare(svg('<circle cx="12" cy="12" r="10"/>','width="1in" height="72pt"'));assert.equal(units.width,96);assert.equal(units.height,96);
 assert.equal(window.document.querySelectorAll('svg').length,0);
});
test('self-contained gradients and clipping keep only validated internal fragment references',()=>{
 const result=prepare(svg('<defs><linearGradient id="ice" x1="0%" x2="100%"><stop offset="0" stop-color="#8cabf7"/><stop offset="1" stop-color="#eceff4"/></linearGradient><clipPath id="round"><circle cx="24" cy="24" r="20"/></clipPath></defs><rect width="48" height="48" fill="url(#ice)" clip-path="url(\'#round\')"/>'));
 const output=decode(result.bytes);assert.match(output,/linearGradient/);assert.match(output,/clipPath/);assert.match(output,/url\(#ice\)/);assert.match(output,/url\('#round'\)/);
});
test('active documents, external resources, CSS escapes and embedded raster content fail before image decoding',()=>{
 for(const body of ['<script>alert(1)</script><rect width="4" height="4"/>','<foreignObject><p xmlns="http://www.w3.org/1999/xhtml">html</p></foreignObject>','<image href="https://outside.invalid/a.png"/>','<image href="data:image/png;base64,AAAA"/>','<use href="#x"/>','<mask id="m"><rect width="4" height="4"/></mask>','<rect mask="url(#m)" width="4" height="4"/>','<filter id="f"><feGaussianBlur stdDeviation="4"/></filter>','<animate attributeName="x" values="0;1"/>','<style>@import "https://outside.invalid/a.css";</style>','<?xml-stylesheet href="https://outside.invalid/a.css"?><rect width="4" height="4"/>','<rect width="4" height="4" onload="fetch(\'https://outside.invalid\')"/>','<rect style="fill: red" width="4" height="4"/>','<rect fill="url(https://outside.invalid/a.svg#paint)" width="4" height="4"/>','<rect fill="u\\72l(//outside.invalid/a.svg)" width="4" height="4"/>'])assert.throws(()=>prepare(svg(body)),/SVG|unsupported|outside|static|links|escaped/);
 assert.equal(window.document.querySelectorAll('svg,script,style,img').length,0);
});
test('resource-bearing markup is rejected before an XML parser can observe it',()=>{
 let parserCalls=0;const host={document:window.document,XMLSerializer:window.XMLSerializer,DOMParser:class{constructor(){parserCalls++;}parseFromString(){throw Error('Unexpected parse');}}};
 for(const source of [svg('<image href="https://outside.invalid/a.png"/>'),svg('<x:image xmlns:x="http://www.w3.org/2000/svg" x:href="https://outside.invalid/a.png"/>'),svg('<rect style="fill:red" width="4" height="4"/>'),svg('<rect fill="url(https://outside.invalid/a.svg#paint)" width="4" height="4"/>'),svg('<rect fill="u&#114;l(https://outside.invalid/a.svg#paint)" width="4" height="4"/>'),svg('<rect fill="u&#92;72l(//outside.invalid/a.svg)" width="4" height="4"/>'),svg('<defs><linearGradient id="paint"><stop offset="0" stop-color="red"/></linearGradient></defs><rect fill="url(#paint)" width="4" height="4"/>','width="64" height="48" xml:base="https://outside.invalid/paint.svg"'),'<?xml-stylesheet href="https://outside.invalid/a.css"?>'+svg('<rect width="4" height="4"/>'),'<!DOCTYPE svg SYSTEM "https://outside.invalid/a.dtd">'+svg('<rect width="4" height="4"/>')])assert.throws(()=>prepareProfileSvg(encode(source),{window:host}),/SVG|static|unsupported/);
 assert.equal(parserCalls,0);
});
test('DOCTYPE, entities, malformed XML and missing or excessive dimensions are rejected',()=>{
 for(const source of ['<!DOCTYPE svg [<!ENTITY x SYSTEM "https://outside.invalid/a">]>'+svg('<text>&x;</text>'),'<svg><path></svg>',svg('<path d="M0 0H1V1Z"/>',''),svg('<path d="M0 0H1V1Z"/>','width="20000" height="20000"'),svg('<path d="M0 0H1V1Z"/>','viewBox="0 0 1e309 10"'),'<html xmlns="http://www.w3.org/1999/xhtml"><p>not SVG</p></html>'])assert.throws(()=>prepare(source),/SVG|width|viewBox|large|read/);
 assert.throws(()=>prepareProfileSvg(new Uint8Array([0xff,0xfe,0]),{window}),/UTF-8/);
 assert.throws(()=>prepareProfileSvg(encode(svg('<path d="M0 0H1V1Z"/>'))),/unavailable/);
});
test('invalid fragment names, duplicate IDs, cyclic clipping and unbounded coordinates cannot reach the decoder',()=>{
 for(const body of ['<rect id="same" width="4" height="4"/><circle id="same" r="1"/>','<rect fill="url(#missing)" width="4" height="4"/>','<defs><clipPath id="c"><rect clip-path="url(#c)" width="4" height="4"/></clipPath></defs><rect width="4" height="4"/>','<defs><clipPath id="c"><rect width="4" height="4"/></clipPath></defs><rect fill="url(#c)" width="4" height="4"/>','<path d="M1e309 0H1V1Z"/>','<path d="M0 0H1V1Z" stroke-width="1e309"/>'])assert.throws(()=>prepare(svg(body)),/SVG|repeated|internal|clipping|coordinates/);
});
test('file, node, depth, path and text complexity limits fail before native image allocation',()=>{
 assert.throws(()=>prepareProfileSvg(new Uint8Array(1024*1024+1),{window}),/1 MiB/);
 assert.throws(()=>prepare(svg('<g>'.repeat(66)+'<path d="M0 0H1V1Z"/>'+'</g>'.repeat(66))),/complex/);
 assert.throws(()=>prepare(svg('<rect width="1" height="1"/>'.repeat(10001))),/complex/);
 assert.throws(()=>prepare(svg('<path d="M0 0 '+('L1 1 '.repeat(14000))+'"/>')),/path detail/);
 assert.throws(()=>prepare(svg('<text>'+('x'.repeat(131073))+'</text>')),/too much text/);
});
test('the actual browser bundle uses its own window without requiring a supplied DOM adapter',async()=>{
 const bundle=await build({entryPoints:[fileURLToPath(new URL('../src/profile-svg.mjs',import.meta.url))],bundle:true,format:'iife',globalName:'ProfileSvgTest',platform:'browser',write:false});
 const dom=new JSDOM('',{runScripts:'outside-only'});
 try{
  dom.window.TextDecoder=TextDecoder;dom.window.TextEncoder=TextEncoder;
  vm.runInContext(bundle.outputFiles[0].text,dom.getInternalVMContext());
  const result=dom.window.ProfileSvgTest.prepareProfileSvg(encode(svg('<rect width="16" height="12" fill="#8cabf7"/>')));
  assert.equal(result.width,64);assert.equal(result.height,48);assert.match(decode(result.bytes),/<rect/);assert.equal(dom.window.document.querySelector('svg'),null);
 }finally{dom.window.close();}
});

let failures=0;try{for(const [name,run]of tests){try{await run();console.log('PASS '+name);}catch(error){failures++;console.error('FAIL '+name,error.stack);}}}finally{window.close();}
console.log(`${tests.length-failures}/${tests.length} static SVG import checks passed. Actual jsdom/DOMPurify/XML parsing; browser SVG rendering and Canvas rasterization remain unverified.`);
process.exitCode=failures?1:0;
