import {build} from 'esbuild';
await build({entryPoints:['src/profile-media-browser.mjs'],bundle:true,format:'iife',globalName:'VoidMediaValidation',target:'es2022',outfile:'dist/media-validation.js',minify:true,legalComments:'inline'});
