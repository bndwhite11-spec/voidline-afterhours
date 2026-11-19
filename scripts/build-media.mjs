import {build} from 'esbuild';
await build({entryPoints:['src/media-validation.mjs'],bundle:true,format:'iife',globalName:'VoidMediaValidation',target:'es2022',outfile:'dist/media-validation.js',minify:true,legalComments:'inline'});
await build({entryPoints:['src/profile-media-browser.mjs'],bundle:true,format:'iife',globalName:'VoidProfileImageTools',target:'es2022',outfile:'dist/pkg/profile-images/tools.js',minify:true,legalComments:'inline'});
