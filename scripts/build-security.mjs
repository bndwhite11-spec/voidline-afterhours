import {build} from 'esbuild';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await build({entryPoints:[path.join(root,'src/passkey-client.js')],outfile:path.join(root,'dist/passkey-client.js'),bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,sourcemap:false,legalComments:'inline'});
console.log('Built local SimpleWebAuthn browser helper.');
