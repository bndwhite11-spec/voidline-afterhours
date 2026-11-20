import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import {build} from 'esbuild';
import { cp, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const runtimeDirectory = path.join(root, '.sites-runtime');
const manifest = JSON.parse(await readFile(path.join(root, '.openai/hosting.json'), 'utf8'));
if (manifest.static != null) throw new Error('Worker builds must omit static from .openai/hosting.json.');
if (manifest.d1 !== 'DB') throw new Error('The live messaging API requires the declared D1 binding DB.');
if (!manifest.project_id) throw new Error('The existing Site project_id must be preserved.');

const contentTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.zip': 'application/zip', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4',
  '.wasm': 'application/wasm',
  '.apk': 'application/vnd.android.package-archive',
};
const excludedRoots = new Set(['server', '.openai', '_appgen_meta']);
// v7's sample/archive source remains in the source download and tests. It is
// never an executable production fallback or automatically loaded fixture.
const productionRoots = new Set(['icons','install.html','mobile.js','mobile.css','art','art-motion.css','art-review.html','art-review.css','art-review.js','account-export.js','theme.js','media-validation.js','profile-media.js','native-media.js','native-media.css','native-outbox.js','native-timeline.js','native-messaging.css','realtime.js','collectible-art.js','index.html','help.html','help.css','notifications.js','push-worker.js','startup.js','startup.css','entry.js','entry.css','home.js','home.css','store.js','legacy-import.js',
  'cosmetics.js','cosmetics.css','social.js','social.css',
  'organize.js','organize.css','gift-collections.js','profile-looks.js','profile-showcase.js','profiles-panel.js','profile-media.css','gift-collections.css','profile-looks.css','profiles-panel.css','profile-showcase.css','appearance.css','admin.js','admin.css','passkey-client.js',
  'icon.svg','manifest.webmanifest','secure-messenger.js','secure-messenger.js.LEGAL.txt','pkg','downloads','.well-known']);
const release = JSON.parse(await readFile(path.join(output,'downloads/voidline-release.json'),'utf8'));
if(!/^v[0-9]+\.[0-9]+\.[0-9]+$/.test(release.tag)||release.android?.filename!=='VOIDLINE-Android.apk'||!/^app\.voidline\.afterhours$/.test(release.android?.packageId||''))throw Error('Native release metadata is incomplete.');
const apkBytes=await readFile(path.join(output,'downloads',release.android.filename));
if(apkBytes.length!==release.android.bytes||createHash('sha256').update(apkBytes).digest('hex')!==release.android.sha256||apkBytes[0]!==0x50||apkBytes[1]!==0x4b)throw Error('Android package is missing or does not match the verified release.');
// Historical route names are retained independently of generated v3 files so
// a source-ZIP rebuild can redirect cached clients to current credited artwork.
// Only the image rendering changes; catalog IDs and ownership remain stable.
const legacyV3Filenames = [
  "angel-card.5878cda62089.svg",
  "angel-detail.2ed13f576122.svg",
  "angel-mini.67a28128fc70.svg",
  "angel-silhouette.b208ace65406.svg",
  "coin-bitforge-card.45cb2ca928d6.svg",
  "coin-bitforge-detail.8af6807d59f2.svg",
  "coin-bitforge-mini.82a5ee14e025.svg",
  "coin-bitforge-silhouette.9334f39c2f5d.svg",
  "coin-cold-storage-card.5c93a2458ac6.svg",
  "coin-cold-storage-detail.3ad80949636d.svg",
  "coin-cold-storage-mini.1fb262b0ce96.svg",
  "coin-cold-storage-silhouette.f817930a8fc1.svg",
  "coin-crosssignal-card.92ff9e5d4f1a.svg",
  "coin-crosssignal-detail.8c4a9ed63d85.svg",
  "coin-crosssignal-mini.79a09d7b1a94.svg",
  "coin-crosssignal-silhouette.6ab5d44b04b9.svg",
  "coin-diamondhands-card.9add5ccc9cb9.svg",
  "coin-diamondhands-detail.e9f9c1b0e794.svg",
  "coin-diamondhands-mini.f145561ec67e.svg",
  "coin-diamondhands-silhouette.691a83f9d3cc.svg",
  "coin-etherglass-card.5ac546ffb85b.svg",
  "coin-etherglass-detail.4a818ec84df3.svg",
  "coin-etherglass-mini.5c8b0b8b7332.svg",
  "coin-etherglass-silhouette.9d41930e6515.svg",
  "coin-genesis-block-card.bea36704cd77.svg",
  "coin-genesis-block-detail.123a303d7252.svg",
  "coin-genesis-block-mini.867d12963a68.svg",
  "coin-genesis-block-silhouette.31becec07c1c.svg",
  "coin-moon-pending-card.3c8fad785ac6.svg",
  "coin-moon-pending-detail.2e9dc7dcab58.svg",
  "coin-moon-pending-mini.2ba22a06e4f3.svg",
  "coin-moon-pending-silhouette.2942615d6161.svg",
  "coin-moonshibe-card.7e728538028c.svg",
  "coin-moonshibe-detail.02c4db5800cb.svg",
  "coin-moonshibe-mini.2fc257b42f7c.svg",
  "coin-moonshibe-silhouette.c70d9cdb6c00.svg",
  "coin-solarstack-card.e38c6c572a9e.svg",
  "coin-solarstack-detail.b856ade4df2c.svg",
  "coin-solarstack-mini.a9875275df62.svg",
  "coin-solarstack-silhouette.3aebefdd1231.svg",
  "dead-card.1bace5213f75.svg",
  "dead-detail.85508c8727a1.svg",
  "dead-mini.b4a405c88f70.svg",
  "dead-silhouette.f28500284b64.svg",
  "ego-ownness-card.159b228e4718.svg",
  "ego-ownness-detail.3931065f8b77.svg",
  "ego-ownness-mini.bd356fbf8ecb.svg",
  "ego-ownness-silhouette.0bdd78bee29b.svg",
  "ego-spook-breaker-card.8cf588c78bdd.svg",
  "ego-spook-breaker-detail.28fc5028992d.svg",
  "ego-spook-breaker-mini.c7087b10756e.svg",
  "ego-spook-breaker-silhouette.2daa5931c053.svg",
  "ego-unique-one-card.e74ddad26be0.svg",
  "ego-unique-one-detail.6f54dd33f12d.svg",
  "ego-unique-one-mini.f7f4bbaabb76.svg",
  "ego-unique-one-silhouette.f643adc62813.svg",
  "ghost-card.905ddc5fe68a.svg",
  "ghost-detail.70ffd792cabc.svg",
  "ghost-mini.b839cc9a1b59.svg",
  "ghost-silhouette.1a6d105114f5.svg",
  "gift-aura-meter-card.d7ab11a96b1e.svg",
  "gift-aura-meter-detail.e333fb83f7e5.svg",
  "gift-aura-meter-mini.d722e319bcac.svg",
  "gift-aura-meter-silhouette.98fcf65c9a47.svg",
  "gift-block-zero-card.fd9d67fe7b9a.svg",
  "gift-block-zero-detail.ffc6ce5f61c5.svg",
  "gift-block-zero-mini.8d980e3e21aa.svg",
  "gift-block-zero-silhouette.674242fd2b4d.svg",
  "gift-brainrot-pop-card.5899f0192e12.svg",
  "gift-brainrot-pop-detail.1c63d43a51ba.svg",
  "gift-brainrot-pop-mini.dfdcc1f7df51.svg",
  "gift-brainrot-pop-silhouette.98e49bdb5b32.svg",
  "gift-cassette-card.5dc8d37f973d.svg",
  "gift-cassette-detail.70f95d101c1f.svg",
  "gift-cassette-mini.972839106dee.svg",
  "gift-cassette-silhouette.0a4d2742c109.svg",
  "gift-chudjak-plush-card.1b6ffaaf4efa.svg",
  "gift-chudjak-plush-detail.44d26866f680.svg",
  "gift-chudjak-plush-mini.d29ba5f5146c.svg",
  "gift-chudjak-plush-silhouette.e7727467bed2.svg",
  "gift-cold-wallet-card.5fd3afddc4cd.svg",
  "gift-cold-wallet-detail.b92ed68d4fbf.svg",
  "gift-cold-wallet-mini.8d96549f7dcd.svg",
  "gift-cold-wallet-silhouette.683a6c776253.svg",
  "gift-copium-cartridge-card.8d416e5dc1c7.svg",
  "gift-copium-cartridge-detail.026d5aac92bf.svg",
  "gift-copium-cartridge-mini.b457a5d531b1.svg",
  "gift-copium-cartridge-silhouette.901921c3b825.svg",
  "gift-copium-tank-card.2884d95ddd97.svg",
  "gift-copium-tank-detail.d2e60ccda4d8.svg",
  "gift-copium-tank-mini.3d43ec49cb38.svg",
  "gift-copium-tank-silhouette.1f3c247b3018.svg",
  "gift-cup-card.8cc82b26dee2.svg",
  "gift-cup-detail.9bd25817d744.svg",
  "gift-cup-mini.550187587fb0.svg",
  "gift-cup-silhouette.bfd76bda6d55.svg",
  "gift-curtain-call-card.cc9ed2e60555.svg",
  "gift-curtain-call-detail.b37ba876947b.svg",
  "gift-curtain-call-mini.e6378a914f7d.svg",
  "gift-curtain-call-silhouette.27a4716b885f.svg",
  "gift-doomer-bloom-card.31192cb24fb7.svg",
  "gift-doomer-bloom-detail.e8bbc9a78adc.svg",
  "gift-doomer-bloom-mini.493e3b5a1ee7.svg",
  "gift-doomer-bloom-silhouette.e04e5c704f48.svg",
  "gift-ego-volume-card.59ee09218a33.svg",
  "gift-ego-volume-detail.a0119efdff5b.svg",
  "gift-ego-volume-mini.896590641739.svg",
  "gift-ego-volume-silhouette.08724a78aa91.svg",
  "gift-ghost-card.6be090bd4a42.svg",
  "gift-ghost-detail.077f65965df5.svg",
  "gift-ghost-mini.d8cc87298e3c.svg",
  "gift-ghost-silhouette.79eb624213a5.svg",
  "gift-halo-card.2b5713a096e7.svg",
  "gift-halo-detail.b198e2809858.svg",
  "gift-halo-mini.d2d129cd41a5.svg",
  "gift-halo-silhouette.d352e7771266.svg",
  "gift-key-card.d7946f61446f.svg",
  "gift-key-detail.35f35bfd92cd.svg",
  "gift-key-mini.b611e71ad89e.svg",
  "gift-key-silhouette.697f3c3fd6e2.svg",
  "gift-larp-cap-card.958c0c3d5f61.svg",
  "gift-larp-cap-detail.46f96674cabe.svg",
  "gift-larp-cap-mini.c3921110dbcd.svg",
  "gift-larp-cap-silhouette.739ba661782b.svg",
  "gift-larp-helmet-card.f0ab7c886087.svg",
  "gift-larp-helmet-detail.95e3ef1ec6ee.svg",
  "gift-larp-helmet-mini.08bfb03b8a4d.svg",
  "gift-larp-helmet-silhouette.93aae440d1df.svg",
  "gift-larp-kit-card.41a29e9a56f0.svg",
  "gift-larp-kit-detail.51e8ee4cb870.svg",
  "gift-larp-kit-mini.4dcd09a04d6c.svg",
  "gift-larp-kit-silhouette.e37026b89fd6.svg",
  "gift-last-broadcast-card.9172a213b0c5.svg",
  "gift-last-broadcast-detail.03c1fcdd156e.svg",
  "gift-last-broadcast-mini.9ad1e4e71981.svg",
  "gift-last-broadcast-silhouette.cdfe67ca074b.svg",
  "gift-last-tab-card.1f1369f1edcf.svg",
  "gift-last-tab-detail.7687e451788d.svg",
  "gift-last-tab-mini.12cea0c886f8.svg",
  "gift-last-tab-silhouette.a42fa11a340d.svg",
  "gift-night-lantern-card.e4443fe08513.svg",
  "gift-night-lantern-detail.3897946aaaa7.svg",
  "gift-night-lantern-mini.5f74655358da.svg",
  "gift-night-lantern-silhouette.961225fef89d.svg",
  "gift-orbit-mobile-card.7ad8b6726049.svg",
  "gift-orbit-mobile-detail.3741bf4026c2.svg",
  "gift-orbit-mobile-mini.f94e8e359973.svg",
  "gift-orbit-mobile-silhouette.d0fc6af0eaf2.svg",
  "gift-orchid-card.4c051f2d8d34.svg",
  "gift-orchid-detail.720be32b21f7.svg",
  "gift-orchid-mini.54dd865ff224.svg",
  "gift-orchid-silhouette.24f8f85ae58e.svg",
  "gift-parcel-card.4db63474ce4e.svg",
  "gift-parcel-detail.3dc833d03c3d.svg",
  "gift-parcel-mini.4bf03f251ede.svg",
  "gift-parcel-silhouette.894a4b6b87ba.svg",
  "gift-pocket-doomer-card.b5ddb8adfe59.svg",
  "gift-pocket-doomer-detail.521bcbf4e159.svg",
  "gift-pocket-doomer-mini.6a87dbe170e2.svg",
  "gift-pocket-doomer-silhouette.81d3983af20c.svg",
  "gift-rose-card.6ed72b5d1aea.svg",
  "gift-rose-detail.807a0cb15699.svg",
  "gift-rose-mini.49050499bd41.svg",
  "gift-rose-silhouette.a8ca1e16ff47.svg",
  "gift-seraph-card.0e34eca66e64.svg",
  "gift-seraph-detail.e8c672ea7d16.svg",
  "gift-seraph-mini.b9e10008da0e.svg",
  "gift-seraph-silhouette.1e9c918f8e4d.svg",
  "gift-signal-card.a391a832e473.svg",
  "gift-signal-detail.2cf3cc55f9f7.svg",
  "gift-signal-mini.7e42edcca6eb.svg",
  "gift-signal-silhouette.da342c6dc1be.svg",
  "gift-spook-crystal-card.749c0b93cd9a.svg",
  "gift-spook-crystal-detail.55edf43d1153.svg",
  "gift-spook-crystal-mini.1a12dd740b2a.svg",
  "gift-spook-crystal-silhouette.a5a855b19dcc.svg",
  "gift-star-card.7ebc1e35188b.svg",
  "gift-star-detail.aa75ce9b30a1.svg",
  "gift-star-mini.37d0dee081e2.svg",
  "gift-star-silhouette.97a4d8e50c0a.svg",
  "gift-ticket-card.b86436c280d2.svg",
  "gift-ticket-detail.a8d0634b8f04.svg",
  "gift-ticket-mini.23b4e5856a73.svg",
  "gift-ticket-silhouette.8b13cc9cba55.svg",
  "gift-wojak-jelly-card.529678e74d98.svg",
  "gift-wojak-jelly-detail.fa8555e77afa.svg",
  "gift-wojak-jelly-mini.1c11eb669bd3.svg",
  "gift-wojak-jelly-silhouette.502c930db89d.svg",
  "guild-cardboard-paladin-card.0e60e73dbe41.svg",
  "guild-cardboard-paladin-detail.677f51ed0d68.svg",
  "guild-cardboard-paladin-mini.70539bed7300.svg",
  "guild-cardboard-paladin-silhouette.3664a5f25d93.svg",
  "guild-forum-wizard-card.314658c1dc00.svg",
  "guild-forum-wizard-detail.d780678931da.svg",
  "guild-forum-wizard-mini.3ca1c0ee3505.svg",
  "guild-forum-wizard-silhouette.8e1b369173dd.svg",
  "guild-guildless-knight-card.546aef71c7a0.svg",
  "guild-guildless-knight-detail.3a965de8db96.svg",
  "guild-guildless-knight-mini.3b20e6e41658.svg",
  "guild-guildless-knight-silhouette.4e324621e4c6.svg",
  "guild-side-quest-card.3ba7aac1e730.svg",
  "guild-side-quest-detail.53a52499ea03.svg",
  "guild-side-quest-mini.569c8cc87e83.svg",
  "guild-side-quest-silhouette.309d3face676.svg",
  "larp-card.60219497ec83.svg",
  "larp-detail.a9d76522e0c7.svg",
  "larp-mini.80ddb5f63ccb.svg",
  "larp-silhouette.cf705e86f36a.svg",
  "meme-absolute-cinema-card.a49292718b45.svg",
  "meme-absolute-cinema-detail.d636504d4aab.svg",
  "meme-absolute-cinema-mini.f3fe834e2785.svg",
  "meme-absolute-cinema-silhouette.c19274dfa9bb.svg",
  "meme-aura-farmer-card.cade6e9657cf.svg",
  "meme-aura-farmer-detail.ed48a75a1fcb.svg",
  "meme-aura-farmer-mini.daca5637ddcd.svg",
  "meme-aura-farmer-silhouette.a53fb237fe6f.svg",
  "meme-aura-receipt-card.84e11022f5b1.svg",
  "meme-aura-receipt-detail.48001da3b7f7.svg",
  "meme-aura-receipt-mini.c093e0176b7e.svg",
  "meme-aura-receipt-silhouette.84b3b72ceb6f.svg",
  "meme-bloomer-card.8951167d3848.svg",
  "meme-bloomer-detail.270a30443580.svg",
  "meme-bloomer-mini.1f3ed13633d2.svg",
  "meme-bloomer-silhouette.50c79fcd8c2e.svg",
  "meme-chud-card.c9c5bcb65416.svg",
  "meme-chud-detail.30a647cc1bfa.svg",
  "meme-chud-mini.06208ca758eb.svg",
  "meme-chud-silhouette.5156359f65b0.svg",
  "meme-cooked-card.43b11c404462.svg",
  "meme-cooked-detail.8729c767bbc0.svg",
  "meme-cooked-mini.9cad99a6def9.svg",
  "meme-cooked-silhouette.4462dd07cef3.svg",
  "meme-cope-seethe-card.9e3a23fd41f2.svg",
  "meme-cope-seethe-detail.3d53068cbf80.svg",
  "meme-cope-seethe-mini.35f0a48c85f3.svg",
  "meme-cope-seethe-silhouette.28d86325e2d8.svg",
  "meme-copium-card.aacc0d4ce4be.svg",
  "meme-copium-detail.4e1755801b42.svg",
  "meme-copium-mini.d6aa580d8fc4.svg",
  "meme-copium-silhouette.f26c8adb764f.svg",
  "meme-dilly-dally-card.124acad8a0a9.svg",
  "meme-dilly-dally-detail.ea6601908ddf.svg",
  "meme-dilly-dally-mini.03b1dcd2afbb.svg",
  "meme-dilly-dally-silhouette.c9cffe2e4fd2.svg",
  "meme-doomer-card.1cd1aba0fc86.svg",
  "meme-doomer-detail.ee4136e2ef49.svg",
  "meme-doomer-mini.e43818d0b65b.svg",
  "meme-doomer-silhouette.a9345fd1907b.svg",
  "meme-final-reply-card.971b89a3456c.svg",
  "meme-final-reply-detail.0090a96b83eb.svg",
  "meme-final-reply-mini.6d92ae0a6b00.svg",
  "meme-final-reply-silhouette.2f5cb51b39bd.svg",
  "meme-gigachad-card.759608008f80.svg",
  "meme-gigachad-detail.47fc6390dfe3.svg",
  "meme-gigachad-mini.5f46b7aa7968.svg",
  "meme-gigachad-silhouette.a8a0ab256e50.svg",
  "meme-grass-card.8704d036d6cc.svg",
  "meme-grass-detail.3ef0737d832f.svg",
  "meme-grass-mini.34b154163b4c.svg",
  "meme-grass-silhouette.ddee1aacb21c.svg",
  "meme-locked-in-alien-card.3350ed647f82.svg",
  "meme-locked-in-alien-detail.ed570ce9278f.svg",
  "meme-locked-in-alien-mini.9cd1fec1a675.svg",
  "meme-locked-in-alien-silhouette.10b8715f5c56.svg",
  "meme-nothing-happens-card.610636c9d876.svg",
  "meme-nothing-happens-detail.98439c34daaa.svg",
  "meme-nothing-happens-mini.6a349d70e844.svg",
  "meme-nothing-happens-silhouette.8c124005259f.svg",
  "meme-npc-card.72bd588f3d8e.svg",
  "meme-npc-detail.455604c5b356.svg",
  "meme-npc-mini.f98321d1a894.svg",
  "meme-npc-silhouette.1557a97ec32e.svg",
  "meme-pepe-card.ae7d67ece418.svg",
  "meme-pepe-detail.59e01e93e446.svg",
  "meme-pepe-mini.4d7b2f1f52b5.svg",
  "meme-pepe-silhouette.398a84df05a3.svg",
  "meme-six-seven-card.95d44c2a43c9.svg",
  "meme-six-seven-detail.fc64bd41d892.svg",
  "meme-six-seven-mini.e6fe16e30ad1.svg",
  "meme-six-seven-silhouette.8c0b96216745.svg",
  "meme-soyjak-card.52fac1934315.svg",
  "meme-soyjak-detail.91966fdb63b1.svg",
  "meme-soyjak-mini.3e2c2cd97ea5.svg",
  "meme-soyjak-silhouette.10950fbff1b8.svg",
  "meme-terminal-card.8a50ede134d3.svg",
  "meme-terminal-detail.0817071324f4.svg",
  "meme-terminal-mini.d6173d187c39.svg",
  "meme-terminal-silhouette.e1323f9cb50a.svg",
  "meme-wojak-card.2a08a617df9c.svg",
  "meme-wojak-detail.89e2e9f50e27.svg",
  "meme-wojak-mini.d9a2c4b92271.svg",
  "meme-wojak-silhouette.523610400db3.svg",
  "meme-yapper-card.5ca64c31a1a2.svg",
  "meme-yapper-detail.dbed28ddd25c.svg",
  "meme-yapper-mini.4e9371bb1e7a.svg",
  "meme-yapper-silhouette.e81dc35f3f9d.svg",
  "night-card.3598d5f471b9.svg",
  "night-detail.5d5f946bb1f1.svg",
  "night-mini.9913c1a2a4b6.svg",
  "night-silhouette.689850602fc0.svg",
  "orbit-card.ad2dbceb56f1.svg",
  "orbit-detail.08d1a6373247.svg",
  "orbit-mini.0d2da6f20778.svg",
  "orbit-silhouette.6ec7cd4ab115.svg",
  "profile-authored-card.1e852c98b147.svg",
  "profile-authored-detail.8d108f45aba0.svg",
  "profile-authored-mini.0e5850b17d57.svg",
  "profile-authored-silhouette.e95fdf83563f.svg",
  "reviewed-contribution-card.60caafec4a37.svg",
  "reviewed-contribution-detail.e00ef51a474c.svg",
  "reviewed-contribution-mini.8e52b265678a.svg",
  "reviewed-contribution-silhouette.731fbcfae2f5.svg",
  "unknown-card.b1bb68259164.svg",
  "unknown-detail.415a18e2af95.svg",
  "unknown-mini.680ea45b0bea.svg",
  "unknown-silhouette.935ea9a6178a.svg",
  "velvet-card.ba7a21fc87fe.svg",
  "velvet-detail.bb4ea18a5bf0.svg",
  "velvet-mini.de5b00d3e404.svg",
  "velvet-silhouette.86d2cc491c74.svg",
  "voidwalker-card.ac4c11827ca4.svg",
  "voidwalker-detail.651312fa5a2f.svg",
  "voidwalker-mini.c85910b27b71.svg",
  "voidwalker-silhouette.171ba2f39afd.svg"
];
async function legacyArtworkAliases() {
  const current=JSON.parse(await readFile(path.join(output,'art/v4/manifest.json'),'utf8'));
  const byId=new Map(current.items.map(item=>[item.id,item]));
  const aliases=Object.create(null);
  for(const filename of legacyV3Filenames){
    const match=/^(.+)-(mini|card|detail|silhouette)\.[a-f0-9]{12,64}\.svg$/.exec(filename);
    const target=match&&byId.get(match[1])?.variants?.[match[2]]?.url;
    if(!target||!target.startsWith('/art/v4/'))throw new Error('Missing current artwork for legacy route: '+filename);
    aliases['/art/v3/'+filename]=target;
  }
  aliases['/art/v3/manifest.json']='/art/v4/manifest.json';
  // Version 28 manifests can remain open while the cassette animation updates.
  const cassette = byId.get('gift-cassette').variants;
  aliases['/art/v4/gift-cassette-card.36e6120e3ff6.svg'] = cassette.card.url;
  aliases['/art/v4/gift-cassette-detail.be18797dc5bf.svg'] = cassette.detail.url;
  return aliases;
}
const legacyArtAliases=await legacyArtworkAliases();
const assets = {};
// Each downloaded raster can appear as a public source file and as an embedded
// data URI in several self-contained SVG variants. Keep one copy in the Worker;
// reconstruct exact SVG bytes at response time rather than tripling image data.
const rasterData = Object.create(null);
const rasterMarker = '__VOIDLINE_STATIC_RASTER_SHA256_';
const rasterURI = /data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})/g;
let assetBytes = 0, rasterOccurrences = 0, rasterReferencedBytes = 0, rasterUniqueBytes = 0;
function internRaster(bytes) {
  const key = createHash('sha256').update(bytes).digest('hex');
  rasterOccurrences++; rasterReferencedBytes += bytes.length;
  if (!Object.hasOwn(rasterData,key)) { rasterData[key] = bytes.toString('base64'); rasterUniqueBytes += bytes.length; }
  return key;
}
async function collect(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if ((!prefix && (excludedRoots.has(entry.name)||!productionRoots.has(entry.name))) || (entry.name.startsWith('.')&&relative!=='.well-known')) continue;
    if(prefix==='.well-known'&&relative!=='.well-known/assetlinks.json')continue;
    if(prefix==='downloads'&&!['voidline-offline.html','voidline-improvement-prompt.txt','voidline-release.json','VOIDLINE-Android.apk'].includes(entry.name)) continue;
    if(relative==='art/v3')continue; // Compatibility routes below serve current artwork without duplicating retired pixels.
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(filename, relative);
    else if (entry.isFile()) {
      const bytes = await readFile(filename);
      assetBytes += bytes.length;
      const extension = path.extname(entry.name).toLowerCase();
      const metadata = {
        type: contentTypes[extension] || 'application/octet-stream',
        etag: `"${createHash('sha256').update(bytes).digest('hex').slice(0, 24)}"`,
        ...(extension==='.apk'?{size:bytes.length}:{}),
      };
      if (relative.startsWith('art/sources/') && /[.](?:png|jpe?g|webp)$/i.test(relative)) {
        assets[`/${relative}`] = {...metadata,rasterKey:internRaster(bytes)};
        continue;
      }
      let stored = bytes;
      const rasterRefs = [];
      if (relative.startsWith('art/') && extension === '.svg') {
        const source = bytes.toString('utf8');
        if (source.includes(rasterMarker)) throw new Error('Reserved raster marker in SVG: '+relative);
        const template = source.replace(rasterURI,(_match,mime,base64) => {
          const image = Buffer.from(base64,'base64');
          if (image.toString('base64') !== base64) throw new Error('Noncanonical embedded raster in '+relative);
          const key = internRaster(image), placeholder = rasterMarker+key+'_'+mime.slice(6)+'__';
          if (!rasterRefs.some(ref => ref.placeholder === placeholder && ref.mime === mime)) rasterRefs.push({placeholder,key,mime});
          return placeholder;
        });
        if (rasterRefs.length) stored = Buffer.from(template,'utf8');
      }
      const compressed = (stored.length>32768||extension==='.svg'&&stored.length>1024) ? gzipSync(stored,{level:9}) : null;
      const encoded = compressed && compressed.length<stored.length*.85 ? compressed : stored;
      assets[`/${relative}`] = {...metadata,
        body: encoded.toString('base64'),
        gzip: encoded!==stored,
        ...(rasterRefs.length?{rasterRefs}:{}),
      };
    } else throw new Error(`Unexpected symlink or special asset: ${relative}`);
  }
}
await collect(output);
if (!assets['/index.html']) throw new Error('Missing dist/index.html. Existing static client source must be retained.');
for(const [legacy,target]of Object.entries(legacyArtAliases)){if(!assets[target]||assets[legacy])throw new Error('Invalid artwork compatibility target: '+legacy);}

const runtime = `
const VOIDLINE_ASSETS = ${JSON.stringify(assets)};
const VOIDLINE_LEGACY_ART = ${JSON.stringify(legacyArtAliases)};
const VOIDLINE_STATIC_RASTERS = ${JSON.stringify(rasterData)};
const VOIDLINE_RELEASE = ${JSON.stringify(release)};
function matrixConnectOrigin(env) {
  try { const u=new URL(env?.MATRIX_HOMESERVER);return u.protocol==='https:'&&u.origin===u.href.replace(/\\/$/,'') ? ' '+u.origin : ''; } catch {return '';}
}

async function apiResponse(request,env,ctx,handler){
  const response=await handler(request,env,ctx);
  if(response.ok){
    await scheduleNotificationDelivery(request,env,ctx).catch(()=>{});
    await scheduleMaintenance(request,env,ctx).catch(()=>{});
  }
  return response;
}
async function serveVoidline(request, env, ctx) {
  const url = new URL(request.url);
  if(['/downloads/VOIDLINE-Windows-x64.zip','/downloads/voidline-source.zip'].includes(url.pathname)||url.pathname.startsWith('/api/native-release-upload/'))return handleNativeReleaseRequest(request,env,VOIDLINE_RELEASE);
  if (url.pathname==='/api/export') return apiResponse(request,env,ctx,handleAccountExportRequest);
  if (url.pathname==='/mcp') return handleOperationsMCP(request,env);
  if (url.pathname==='/api/realtime') return handleRealtimeRequest(request,env);
  if (url.pathname.startsWith('/api/media/')) return apiResponse(request,env,ctx,handleMediaRequest);
  if (url.pathname.startsWith('/api/auth/')) return apiResponse(request,env,ctx,handleAuthRequest);
  if (url.pathname==='/api/encryption'||url.pathname.startsWith('/api/encryption/')) return apiResponse(request,env,ctx,handleEncryptionRequest);
  if (url.pathname==='/api/notifications'||url.pathname.startsWith('/api/notifications/')) return apiResponse(request,env,ctx,handleNotificationsRequest);
  if (url.pathname.startsWith('/api/security/')) return apiResponse(request,env,ctx,handleSecurityRequest);
  if (url.pathname==='/api/admin'||url.pathname.startsWith('/api/admin/')) return apiResponse(request,env,ctx,handleAdminRequest);
  if (url.pathname==='/api/messages'||url.pathname.startsWith('/api/messages/')) return apiResponse(request,env,ctx,handleMessagesRequest);
  if (url.pathname==='/api/organize'||url.pathname.startsWith('/api/organize/')) return apiResponse(request,env,ctx,handleOrganizeRequest);
  if (url.pathname === '/api/profile-looks' || url.pathname.startsWith('/api/profile-looks/')) return apiResponse(request,env,ctx,handleProfileLooks);
  if (url.pathname === '/api/gift-collections' || url.pathname.startsWith('/api/gift-collections/')) return apiResponse(request,env,ctx,handleGiftCollectionsRequest);
  if (url.pathname.startsWith('/api/profiles/')) return apiResponse(request,env,ctx,handleProfilesRequest);
  if (url.pathname.startsWith('/api/cosmetics/')) return apiResponse(request,env,ctx,handleCosmeticsRequest);
  if (url.pathname==='/api/social'||url.pathname.startsWith('/api/social/')) return apiResponse(request,env,ctx,handleSocialRequest);
  if (url.pathname === '/api/live' || url.pathname.startsWith('/api/live/')) {
    return apiResponse(request,env,ctx,handleLiveRequest);
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', {status: 405, headers: {Allow: 'GET, HEAD'}});
  }
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { return new Response('Invalid path', {status: 400}); }
  if(Object.hasOwn(VOIDLINE_LEGACY_ART,pathname))return new Response(null,{status:302,headers:{
    location:VOIDLINE_LEGACY_ART[pathname], 'cache-control':'no-cache',
    'x-content-type-options':'nosniff', 'referrer-policy':'strict-origin-when-cross-origin',
  }});
  const pageRoute = pathname === '/chats' || pathname === '/chats/' || /^\\/(?:users|invite|servers|channels)\\//.test(pathname);
  const asset = VOIDLINE_ASSETS[pathname === '/' || pageRoute ? '/index.html' : pathname];
  if (!asset) return new Response('Not found', {status: 404});
  const headers = {
    'content-type': asset.type,
    'cache-control': pathname.startsWith('/art/') && /[.][a-f0-9]{12,64}[.](?:svg|webp|png|jpg)$/.test(pathname) ? 'public, max-age=31536000, immutable' : 'no-cache',
    'etag': asset.etag,
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(self), geolocation=(), display-capture=()',
    'content-security-policy': "default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self'; connect-src 'self'" + matrixConnectOrigin(env) + "; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'self' https://chatgpt.com https://chat.openai.com; form-action 'self'; upgrade-insecure-requests",
  };
  const androidPackage=pathname==='/downloads/VOIDLINE-Android.apk';
  if(androidPackage){headers['content-disposition']='attachment; filename="VOIDLINE-Android.apk"';headers['accept-ranges']='bytes';headers['content-length']=String(asset.size);}
  if (request.headers.get('if-none-match') === asset.etag) return new Response(null, {status: 304, headers});
  if (request.method === 'HEAD') return new Response(null, {headers});
  if (asset.rasterKey) {
    const bytes = Uint8Array.from(atob(VOIDLINE_STATIC_RASTERS[asset.rasterKey]), c => c.charCodeAt(0));
    return new Response(bytes, {headers});
  }
  const bytes = Uint8Array.from(atob(asset.body), c => c.charCodeAt(0));
  // The Sites proxy owns HTTP content encoding. Keep compressed bytes only
  // inside the Worker bundle, then restore the original stream before handing
  // it to the proxy; otherwise an outer gzip layer hides an inner gzip file.
  const body = asset.gzip ? new Response(bytes).body.pipeThrough(new DecompressionStream('gzip')) : bytes;
  if(androidPackage&&request.headers.get('range')&&(!request.headers.get('if-range')||request.headers.get('if-range')===asset.etag)){
    const match=/^bytes=(\\d*)-(\\d*)$/.exec(request.headers.get('range'));let start=0,end=asset.size-1,valid=!!match&&(!!match[1]||!!match[2]);
    if(valid){if(!match[1]){const suffix=Number(match[2]);valid=Number.isSafeInteger(suffix)&&suffix>0;start=Math.max(0,asset.size-suffix);}else{start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),asset.size-1):end;valid=Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start>=0&&start<=end&&start<asset.size;}}
    if(!valid){delete headers['content-length'];return new Response(null,{status:416,headers:{...headers,'content-range':'bytes */'+asset.size}});}
    const full=body instanceof Uint8Array?body:new Uint8Array(await new Response(body).arrayBuffer());headers['content-range']='bytes '+start+'-'+end+'/'+asset.size;headers['content-length']=String(end-start+1);return new Response(full.slice(start,end+1),{status:206,headers});
  }
  if (asset.rasterRefs) {
    const restored = body instanceof Uint8Array ? body : new Uint8Array(await new Response(body).arrayBuffer());
    let svg = new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(restored);
    for (const reference of asset.rasterRefs) {
      svg = svg.split(reference.placeholder).join('data:'+reference.mime+';base64,'+VOIDLINE_STATIC_RASTERS[reference.key]);
    }
    return new Response(new TextEncoder().encode(svg), {headers});
  }
  return new Response(body, {headers});
}

export default {fetch: serveVoidline};
`;

// Preview state lives outside dist. Keep the production entry's directory in
// place and replace the file atomically so an active watcher never reads a
// partial bundle or loses its directory. Remove only obsolete preview output.
await rm(path.join(output, '.openai'), { recursive: true, force: true });
await mkdir(path.join(output, 'server'), { recursive: true });
await mkdir(path.join(output, '.openai'), { recursive: true });
await mkdir(runtimeDirectory, { recursive: true });
await rm(path.join(output, 'server/wrangler.json'), { force: true });
await rm(path.join(output, 'server/.wrangler'), { recursive: true, force: true });
const compiled=await build({stdin:{contents:`import {handleNativeReleaseRequest} from './worker/native-releases.mjs';\nimport {handleAccountExportRequest} from './worker/account-export.mjs';\nimport {handleOperationsMCP,scheduleMaintenance} from './worker/operations.mjs';\nimport {handleMediaRequest} from './worker/media.mjs';\nimport {handleRealtimeRequest} from './worker/realtime.mjs';\nimport {handleLiveRequest} from './worker/index.mjs';\nimport {handleEncryptionRequest} from './worker/encryption.mjs';\nimport {handleNotificationsRequest,scheduleNotificationDelivery} from './worker/notifications.mjs';\nimport {handleMessagesRequest} from './worker/messages.mjs';\nimport {handleAuthRequest} from './worker/auth.mjs';\nimport {handlePasskeyRequest as handleSecurityRequest} from './worker/passkeys.mjs';\nimport {handleAdminRequest} from './worker/admin.mjs';\nimport {handleOrganizeRequest} from './worker/organize.mjs';\nimport {handleProfileLooks} from './worker/profile-looks.mjs';\nimport {handleGiftCollectionsRequest} from './worker/gift-collections.mjs';\nimport {handleProfilesRequest} from './worker/profiles.mjs';\nimport {handleCosmeticsRequest} from './worker/cosmetics.mjs';\nimport {handleSocialRequest} from './worker/social.mjs';\n${runtime}`,resolveDir:root,sourcefile:'voidline-entry.mjs',loader:'js'},bundle:true,format:'esm',platform:'browser',target:'es2022',write:false,minify:true,legalComments:'inline'});
const bundle=compiled.outputFiles[0].text;
const nextBundle = path.join(runtimeDirectory, 'worker-build.next');
await writeFile(nextBundle, bundle);
await rename(nextBundle, path.join(output, 'server/index.js'));
await writeFile(path.join(output, '.openai/hosting.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await cp(path.join(root, 'drizzle'), path.join(output, '.openai/drizzle'), { recursive: true });

// This configuration and Wrangler's adjacent .wrangler/tmp directory are
// local-only. They must never enter dist or be removed by a production build.
// Sites provisions the hosted binding from the source hosting manifest.
const localConfigPath = path.join(runtimeDirectory, 'wrangler.json');
const localConfig = `${JSON.stringify({
  name: 'voidline-afterhours-local',
  main: '../dist/server/index.js',
  compatibility_date: '2026-05-15',
  r2_buckets: [{binding:'MEDIA',bucket_name:'voidline-media-local'}],
  d1_databases: [{
    binding: 'DB',
    database_name: 'site-creator-d1',
    database_id: '00000000-0000-4000-8000-000000000000',
    // Local preview only: lets `wrangler d1 migrations apply --local` create the
    // schema from the same versioned files the hosted database uses.
    migrations_dir: '../drizzle',
  }],
}, null, 2)}\n`;
let currentLocalConfig;
try { currentLocalConfig = await readFile(localConfigPath, 'utf8'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (currentLocalConfig !== localConfig) {
  const nextConfig = path.join(runtimeDirectory, 'wrangler-config.next');
  await writeFile(nextConfig, localConfig);
  await rename(nextConfig, localConfigPath);
}
console.log(`Built self-contained Worker with ${Object.keys(assets).length} assets and ${Object.keys(legacyArtAliases).length} historical artwork redirects (${assetBytes} source bytes; ${Buffer.byteLength(bundle)} Worker bytes). Shared ${Object.keys(rasterData).length} raster payloads across ${rasterOccurrences} references (${rasterUniqueBytes} unique bytes; ${rasterReferencedBytes-rasterUniqueBytes} repeated raster bytes omitted).`);
