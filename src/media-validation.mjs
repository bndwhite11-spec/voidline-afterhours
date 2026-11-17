/** Bounded image headers and structures; no remote fetching or executable formats. */
export const MEDIA_LIMIT = 8 * 1024 * 1024;
export const IMAGE_PIXELS = 16 * 1024 * 1024;
const fail = message => { throw new Error(message); };
const equal = (bytes, offset, values) => values.every((value, i) => bytes[offset + i] === value);
const ascii = (bytes, start, length) => String.fromCharCode(...bytes.subarray(start, start + length));
const u16 = (b, i) => b[i] * 256 + b[i + 1];
const u32 = (b, i) => (b[i] * 0x1000000 + b[i + 1] * 65536 + b[i + 2] * 256 + b[i + 3]) >>> 0;
const le32 = (b, i) => (b[i] + b[i + 1] * 256 + b[i + 2] * 65536 + b[i + 3] * 0x1000000) >>> 0;
const dimensions = (width, height, maxPixels) => {
 if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 16384 || height > 16384 || width * height > maxPixels) fail('This image is too large. Choose an image under 16 megapixels.');
 return {width, height};
};
export function inspectImage(input, {maxPixels = IMAGE_PIXELS} = {}) {
 const b = input instanceof Uint8Array ? input : new Uint8Array(input);
 if (!b.length || b.length > MEDIA_LIMIT) fail('Choose a file smaller than 8 MiB.');
 if (equal(b, 0, [137,80,78,71,13,10,26,10])) {
  if (b.length < 45 || u32(b, 8) !== 13 || ascii(b, 12, 4) !== 'IHDR') fail('This PNG header is invalid.');
  const size = dimensions(u32(b, 16), u32(b, 20), maxPixels);
  let at = 8, data = false, end = false;
  while (at + 12 <= b.length) {
   const length = u32(b, at), type = ascii(b, at + 4, 4);
   if (!/^[A-Za-z]{4}$/.test(type) || length > b.length - at - 12) fail('This PNG is incomplete.');
   if (['acTL','fcTL','fdAT'].includes(type)) fail('Use a still PNG, JPEG or WebP image.');
   if (type === 'IDAT') data = true;
   if (type === 'IEND') { if (length !== 0 || at + 12 !== b.length) fail('This PNG has an invalid ending.'); end = true; break; }
   at += length + 12;
  }
  if (!data || !end || b[26] !== 0 || b[27] !== 0 || b[28] > 1) fail('This PNG is incomplete or unsupported.');
  return {...size, mime:'image/png', extension:'png'};
 }
 if (equal(b, 0, [255,216,255])) {
  if (!equal(b, b.length - 2, [255,217])) fail('This JPEG is incomplete.');
  let at = 2, size = null, scanned = false;
  while (at < b.length - 2) {
   if (b[at++] !== 255) fail('This JPEG structure is invalid.');
   while (b[at] === 255) at++;
   const marker = b[at++];
   if (marker === 217) break;
   if (marker === 216 || marker === 0 || marker === 1 || (marker >= 208 && marker <= 215)) fail('This JPEG marker is invalid.');
   if (at + 2 > b.length) fail('This JPEG is incomplete.');
   const length = u16(b, at);
   if (length < 2 || at + length > b.length) fail('This JPEG is incomplete.');
   if ([192,193,194].includes(marker)) {
    if (length < 8 || b[at + 2] !== 8) fail('Use a standard 8-bit JPEG.');
    size = dimensions(u16(b, at + 5), u16(b, at + 3), maxPixels);
   }
   if (marker === 218) { scanned = true; break; }
   at += length;
  }
  if (!size || !scanned) fail('This JPEG has no readable image.');
  return {...size, mime:'image/jpeg', extension:'jpg'};
 }
 if (b.length >= 30 && ascii(b,0,4) === 'RIFF' && ascii(b,8,4) === 'WEBP') {
  if (le32(b,4) + 8 !== b.length) fail('This WebP is incomplete.');
  let at = 12, size = null, image = false;
  while (at + 8 <= b.length) {
   const type = ascii(b, at, 4), length = le32(b, at + 4), start = at + 8;
   if (length > b.length - start) fail('This WebP chunk is incomplete.');
   if (type === 'ANIM' || type === 'ANMF' || (type === 'VP8X' && (b[start] & 2))) fail('Use a still PNG, JPEG or WebP image.');
   if (type === 'VP8X') {
    if (length !== 10) fail('This WebP header is invalid.');
    size = dimensions(1 + b[start+4] + (b[start+5]<<8) + (b[start+6]<<16), 1 + b[start+7] + (b[start+8]<<8) + (b[start+9]<<16), maxPixels);
   }
   if (type === 'VP8 ') {
    if (length < 10 || !equal(b,start+3,[157,1,42])) fail('This WebP image is invalid.');
    const decoded = dimensions((b[start+6] | b[start+7]<<8) & 16383, (b[start+8] | b[start+9]<<8) & 16383,maxPixels);
    if (size && (size.width !== decoded.width || size.height !== decoded.height)) fail('This WebP has inconsistent dimensions.');
    size = decoded; image = true;
   }
   if (type === 'VP8L') {
    if (length < 5 || b[start] !== 47) fail('This WebP image is invalid.');
    const bits = le32(b,start+1), decoded = dimensions((bits & 16383)+1, ((bits >>> 14) & 16383)+1,maxPixels);
    if (size && (size.width !== decoded.width || size.height !== decoded.height)) fail('This WebP has inconsistent dimensions.');
    size = decoded; image = true;
   }
   at = start + length + (length & 1);
  }
  if (!size || !image || at !== b.length) fail('This WebP has no complete image.');
  return {...size, mime:'image/webp', extension:'webp'};
 }
 fail('Choose a still PNG, JPEG or WebP image. SVG and GIF are not supported.');
}
export function safeFilename(value) {
 return String(value || 'file').normalize('NFKC').replace(/[\u0000-\u001f\u007f/\\<>:"|?*\u202a-\u202e\u2066-\u2069]/g,'_').trim().slice(0,120) || 'file';
}
