// Render the shipped SVG files and their named motion tracks with librsvg.
// Run after the regular artwork build. The film is a software-rendered study.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir, mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {JSDOM} from 'jsdom';
import sharp from 'sharp';
import {sampleArtPose} from './sample-art-pose.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const {values} = parseArgs({options: {output: {type: 'string'}}});
const output = path.resolve(values.output || path.join(root, 'docs/collectible-proof'));
const manifest = JSON.parse(await readFile(path.join(root, 'dist/art/v4/manifest.json')));
const reference = manifest.items.find(item => item.id === 'gift-copium-cartridge');
assert(reference, 'The original Copium Cartridge is missing.');
const variants = manifest.items.filter(item => item.series === 'Copium Cartridges' && item.id.startsWith('gift-cartridge-'));
assert.equal(variants.length, 5, 'Build all five cartridge models before rendering the study.');
const models = [reference, ...variants];

async function asset(variant) {
  const bytes = await readFile(path.join(root, 'dist', variant.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), variant.sha256, variant.url);
  return bytes;
}

function png(svg, size) {
  return sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();
}

async function pixels(bytes) {
  return sharp(bytes).ensureAlpha().raw().toBuffer();
}

function inspectOutline(buffer, size, label) {
  let occupied = 0, minX = size, minY = size, maxX = -1, maxY = -1;
  for (let i = 0; i < size * size; i++) {
    const alpha = buffer[i * 4 + 3];
    if (alpha < 128) continue;
    occupied++;
    const x = i % size, y = Math.floor(i / size);
    minX = Math.min(x, minX); maxX = Math.max(x, maxX);
    minY = Math.min(y, minY); maxY = Math.max(y, maxY);
    // Optical geometry is checked on a padded, supersampled stage below. At
    // display resolution antialiasing can legitimately color an outer pixel.
    if (size >= 64) {
      assert(x > 0 && y > 0 && x < size - 1 && y < size - 1, label + ' touches an outer edge');
    }
  }
  assert(occupied > size * size * .06, label + ' is too small to identify');
  return {width: maxX - minX + 1, height: maxY - minY + 1};
}

async function verifyOpticalBounds(mini, name) {
  const dom = new JSDOM(mini.toString(), {contentType: 'image/svg+xml'});
  try {
    const svg = dom.window.document.documentElement;
    assert.equal(svg.getAttribute('viewBox'), '0 0 24 24');
    // Pad the viewport by 2 source units on every side, then sample 8×. This
    // exposes genuine out-of-frame geometry without mistaking coverage of a
    // fraction of the last 16px or 24px display pixel for a clipped contour.
    svg.setAttribute('viewBox', '-2 -2 28 28');
    svg.setAttribute('width', '224');
    svg.setAttribute('height', '224');
    const bytes = Buffer.from(new dom.window.XMLSerializer().serializeToString(svg));
    const raw = await sharp(bytes).ensureAlpha().raw().toBuffer();
    for (let k = 0; k < raw.length; k += 4) {
      if (raw[k+3] < 128) continue;
      const x = k / 4 % 224, y = Math.floor(k / 4 / 224);
      assert(x >= 16 && x < 208 && y >= 16 && y < 208, name + ' miniature extends outside its 24-unit stage');
    }
  } finally {
    dom.window.close();
  }
}

const width = 756, column = 240, margin = 18, top = 76, row = 320, stage = 228;
const height = top + row * 2 + margin;
const boardColor = [25, 30, 36];
function position(index) {
  return {x: margin + (index % 3) * column, y: top + Math.floor(index / 3) * row};
}

// Measure the *painted* vapor against the same charcoal used by the contact sheet.
// The comparison clone has only its named vapor layers emptied.
function smokeBounds(full, clear, size) {
  let pixels = 0, minX = size, minY = size, maxX = -1, maxY = -1;
  for (let k = 0; k < full.length; k += 4) {
    const visible = boardColor.some((ground, c) =>
      Math.abs((full[k+c] - ground) * full[k+3] - (clear[k+c] - ground) * clear[k+3]) >= 18 * 255);
    if (!visible) continue;
    const x = k / 4 % size, y = Math.floor(k / 4 / size);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    pixels++;
  }
  return {pixels, minX, minY, maxX, maxY};
}

function plumeCrop({minX, minY, maxX, maxY}) {
  const side = Math.min(stage, Math.max(45, Math.max(maxX - minX, maxY - minY) + 15));
  const pad = (low, high) => Math.max(0, Math.min(stage - side, Math.round((low + high - side) / 2)));
  return {left: pad(minX, maxX), top: pad(minY, maxY), width: side, height: side};
}

function xml(text) {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
}

function lettering(x, y, value, size, color, weight = 400, end = false) {
  return '<text x="' + x + '" y="' + y + '" font-size="' + size + '" fill="' + color
    + '" font-weight="' + weight + '" text-anchor="' + (end ? 'end' : 'start') + '">' + xml(value) + '</text>';
}

function board(withOptics) {
  let content = lettering(margin, 38, 'Copium Cartridges', 33, '#eef0ed', 600);
  if (withOptics) content += lettering(margin, 63, 'Smoke detail  ·  Inventory 64 px  ·  Miniatures 24 / 16 px', 16, '#b7c2bf');
  for (const [i, item] of models.entries()) {
    const {x, y} = position(i);
    content += '<path d="M' + (x + 6) + ' ' + y + 'h228" stroke="#424c51"/>';
    if (i === 0) content += lettering(x + 6, y + 21, 'Original', 15, '#b7c2bf');
    content += lettering(x + 6, y + 46, item.name, 27, '#e9ede9', 700);
    if (withOptics) {
      content += '<rect x="' + (x+5) + '" y="' + (y+217) + '" width="89" height="89" rx="4" fill="#232b32" stroke="#465257"/>'
        + '<rect x="' + (x+164) + '" y="' + (y+270) + '" width="63" height="32" rx="3" fill="#d9d8d2"/>';
    }
  }
  return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height
    + '" font-family="Liberation Sans, sans-serif"><rect width="100%" height="100%" fill="#191e24"/>'
    + content + '</svg>');
}

const scratch = await mkdtemp(path.join(tmpdir(), 'voidline-cartridges-'));
const scenes = [], panels = [], opticalMarks = [];
let referenceFootprint;
await mkdir(output, {recursive: true});
try {
  for (const [i, item] of models.entries()) {
    const {x, y} = position(i);
    const [detail, card, mini, silhouette] = await Promise.all(['detail', 'card', 'mini', 'silhouette'].map(v => asset(item.variants[v])));
    await verifyOpticalBounds(mini, item.name);
    const dom = new JSDOM(detail.toString(), {contentType: 'image/svg+xml'});
    const motion = JSON.parse(dom.window.document.documentElement.getAttribute('data-motion'));
    assert.deepEqual(motion, item.motion, item.name + ' motion metadata');
    const unpainted = new JSDOM(detail.toString(), {contentType: 'image/svg+xml'});
    scenes.push({dom, motion, unpainted});
    const vapor = [...unpainted.window.document.querySelectorAll('[data-part]')].filter(node =>
      /(?:smoke|vapor|plume)/.test(node.getAttribute('data-part')));
    assert(vapor.length, item.name + ' must have a named vapor layer to inspect');
    for (const group of vapor) group.remove();
    const shape = await png(silhouette, 64);
    inspectOutline(await pixels(shape), 64, item.name + ' silhouette');

    const poseAt = fraction => png(sampleArtPose(dom, motion, fraction), stage);
    const resting = await poseAt(0);
    const base = await pixels(resting);
    const footprint = inspectOutline(base, stage, item.name + ' rest');
    if (!referenceFootprint) referenceFootprint = footprint;
    assert(footprint.width >= .80 * referenceFootprint.width && footprint.width > 1.22 * footprint.height,
      item.name + ' must retain a broad cartridge footprint at the original scale');
    assert(base.equals(await pixels(await poseAt(1))), item.name + ' does not return to its first pose');
    const times = new Set([0, .19, .48, .74, 1, ...motion.layers.flatMap(layer => layer.frames.map(frame => frame.at))]);
    let changed = 0, bestSmoke;
    for (const t of times) {
      const pose = await poseAt(t);
      const frame = await pixels(pose);
      inspectOutline(frame, stage, item.name + ' at ' + t);
      const hidden = await pixels(await png(sampleArtPose(unpainted, motion, t), stage));
      const bounds = smokeBounds(frame, hidden, stage);
      if (!bestSmoke || bounds.pixels > bestSmoke.pixels) bestSmoke = {...bounds, pose, time: t};
      let difference = 0;
      for (let k = 0; k < frame.length; k += 4) {
        if ([0, 1, 2, 3].some(c => Math.abs(base[k+c] - frame[k+c]) > 24)) difference++;
      }
      changed = Math.max(changed, difference);
    }
    assert(changed > 80, item.name + ' has no discernible motion at inspection size');
    assert(bestSmoke.pixels >= 12, item.name + ' has insufficient visible vapor at its strongest sampled pose');
    panels.push({input: resting, left: x + 6, top: y + 10});
    const crop = await sharp(bestSmoke.pose).extract(plumeCrop(bestSmoke)).resize(85,85).png().toBuffer();
    panels.push({input: crop, left: x + 7, top: y + 219});

    for (const [size, source, left, top] of [[64, card, 99, 228], [24, mini, 170, 234], [16, mini, 201, 238]]) {
      const tile = await png(source, size);
      const raw = await pixels(tile);
      inspectOutline(raw, size, item.name + ' at ' + size + ' px');
      panels.push({input: tile, left: x + left, top: y + top});
      if (size < 64) panels.push({input: tile, left: x + left, top: y + top + 40});
      if (size === 16) opticalMarks.push(raw);
    }
    console.log(item.name + ': ' + times.size + ' poses, resting footprint ' + footprint.width + '×' + footprint.height
      + ', ' + changed + ' moving pixels, ' + bestSmoke.pixels + ' visible vapor pixels at ' + bestSmoke.time);
  }
  for (const [i, icon] of opticalMarks.entries()) {
    for (const previous of opticalMarks.slice(0, i)) {
      let difference = 0;
      for (let k = 0; k < icon.length; k += 4) {
        // Their cylinder outlines can coincide. Compare the interior ink and material colors.
        if (icon[k+3] < 170 || previous[k+3] < 170) continue;
        if ([0,1,2].some(c => Math.abs(icon[k+c] - previous[k+c]) > 30)) difference++;
      }
      assert(difference >= 4, models[i].name + ' miniature interior is indistinguishable from another finish at 16 px');
    }
  }
  await sharp(board(true)).composite(panels).png().toFile(path.join(output, 'copium-cartridges.png'));

  const fps = 24, leadMs = 200, holdMs = 250;
  const totalMs = leadMs + Math.max(...scenes.map(s => s.motion.duration)) + holdMs;
  const filmBase = board(false);
  for (let frame = 0; frame <= Math.ceil(totalMs * fps / 1000); frame++) {
    const tiles = await Promise.all(scenes.map(async ({dom, motion}, i) => {
      const {x, y} = position(i);
      const progress = Math.max(0, Math.min(1, (frame * 1000 / fps - leadMs) / motion.duration));
      return {input: await png(sampleArtPose(dom, motion, progress), stage), left: x + 6, top: y + 58};
    }));
    await sharp(filmBase).composite(tiles).png().toFile(path.join(scratch, 'frame-' + String(frame).padStart(3, '0') + '.png'));
  }
  const film = path.join(output, 'copium-cartridges.mp4');
  const encoding = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(fps), '-i',
    path.join(scratch, 'frame-%03d.png'), '-c:v', 'libx264', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart', film], {stdio: 'inherit'});
  if (encoding.error) throw encoding.error;
  assert.equal(encoding.status, 0, 'Motion study encoding failed.');
} finally {
  for (const {dom, unpainted} of scenes) { dom.window.close(); unpainted.window.close(); }
  await rm(scratch, {recursive: true, force: true});
}
