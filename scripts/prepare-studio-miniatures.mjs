/** Optional master export. The normal build reads the committed fingerprinted PNGs. */
import {createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import sharp from 'sharp';
import {studioObjects} from '../src/art/studio-objects.mjs';

const paths = {};
for (const [id, object] of Object.entries(studioObjects)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96">${object.mini}</svg>`;
  const bytes = await sharp(Buffer.from(svg)).png({compressionLevel:9, palette:true, colours:128, dither:0}).toBuffer();
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0,12);
  const path = '/art/sources/studio-01-'+id+'-mini.'+hash+'.png';
  await writeFile(new URL('../dist'+path,import.meta.url), bytes);
  paths[id] = path;
}
await writeFile(new URL('../src/art/studio-miniatures.json',import.meta.url), JSON.stringify(paths,null,2)+'\n');
