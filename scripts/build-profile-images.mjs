import {build} from 'esbuild';
import {readFile,mkdir,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),source=path.join(root,'node_modules/libheif-js'),destination=path.join(root,'dist/pkg/profile-images');
const metadata=JSON.parse(await readFile(path.join(source,'package.json'),'utf8'));if(metadata.version!=='1.23.5')throw Error('Review a new libheif-js version before updating the shipped decoder.');
await mkdir(destination,{recursive:true});
for(const name of ['libheif.js','libheif.wasm','LICENSE'])await copyFile(path.join(source,'libheif-wasm',name),path.join(destination,name));
await copyFile(path.join(root,'docs/PROFILE-IMAGE-DEPENDENCIES.txt'),path.join(destination,'NOTICE.txt'));
await build({entryPoints:[path.join(root,'src/profile-image-codecs-worker.mjs')],outfile:path.join(destination,'worker.js'),bundle:true,format:'iife',platform:'browser',target:'es2022',minify:true,legalComments:'inline',banner:{js:'/*! Local HEIC/TIFF codecs: licenses, exact corresponding source and replacement instructions at /pkg/profile-images/NOTICE.txt. */'}});
console.log('Built lazy local TIFF worker; copied unmodified libheif-js1.23.5 glue/WASM/license.');
