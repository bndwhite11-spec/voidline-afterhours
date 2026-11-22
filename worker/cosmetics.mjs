/** Free cosmetic collections. These records confer no authorization role. */
import {giftBases} from '../src/art/gift-bases.mjs';
import {webSources} from '../src/art/web-sources.mjs';
import {capsuleCatalogItems,collectibleDisplay} from '../src/collectibles/presentation.mjs';
import {cartridgeDesigns,cartridgeSeries} from '../src/collectibles/cartridge-designs.mjs';
import {legacyPresentations} from '../src/collectibles/legacy-presentations.mjs';
import {inventorySummary,ownInstanceSelect,privateInstance,ownerFilters,transferReceipt,acquisitionTime,acquisitionKind} from './collectible-inventory.mjs';
import {authenticate, validateSessionMutation, normalizeUsername, authRateLimit, AuthError} from './auth.mjs';
export const COSMETICS = Object.freeze([
 {id:'larp',type:'badge',name:'LARP PRO MAX',description:'A polished shield for taking your online persona a little too seriously.',finish:'Brushed titanium'},
 {id:'angel',type:'badge',name:'404 Angel',description:'A small pair of chrome wings with a halo that never quite connects.',finish:'Pale chrome'},
 {id:'ghost',type:'badge',name:'Ghost Frequency',description:'A quiet apparition caught between two radio waves.',finish:'Smoked silver'},
 {id:'velvet',type:'badge',name:'Velvet Static',description:'A ribbon of violet metal, folded into an impossible loop.',finish:'Violet alloy'},
 {id:'night',type:'badge',name:'Night Shift',description:'For the hours when the room gets quieter and the conversation gets better.',finish:'Midnight steel'},
 {id:'unknown',type:'badge',name:'Unknown Entity',description:'An unlabelled object in a finely machined frame.',finish:'Iridescent glass'},
 {id:'dead',type:'badge',name:'Dead Internet',description:'A fractured little globe. Somehow, we are still here.',finish:'Oxidised chrome'},
 {id:'voidwalker',type:'badge',name:'Voidwalker',description:'A cut through the dark, held inside a faceted metal seal.',finish:'Black titanium'},
 {id:'orbit',type:'badge',name:'Low Orbit',description:'A satellite circling a tiny violet moon.',finish:'Satin aluminium'},
 {id:'coin-bitforge',type:'badge',category:'crypto',inspiration:'Bitcoin culture',series:'Chain Signals',name:'Bitcoin',aliases:['Bitforge'],description:'A hammered copper coin with a correctly proportioned Bitcoin mark, recessed cuts and a restrained orange inlay. A cosmetic reference, not proof of holdings.',finish:'Hammered copper'},
 {id:'coin-etherglass',type:'badge',category:'crypto',inspiration:'Ethereum culture',series:'Chain Signals',name:'Ethereum',aliases:['Ether Glass'],description:'Two recognizable separated Ethereum diamond forms in smoky violet glass. Each facet catches a different part of the light.',finish:'Violet optical glass'},
 {id:'coin-crosssignal',type:'badge',category:'crypto',inspiration:'XRP culture',series:'Chain Signals',name:'XRP',aliases:['Cross Signal'],description:'Two opposing curved metal forms hold the XRP mark’s negative space. Ceramic-white faces, mirrored reflections; no Ripple triskelion.',finish:'Chrome and graphite'},
 {id:'coin-solarstack',type:'badge',category:'crypto',inspiration:'Solana culture',series:'Chain Signals',name:'Solana',aliases:['Solar Stack'],description:'Three offset alloy bars, moving from muted jade to deep violet.',finish:'Anodised alloy'},
 {id:'coin-moonshibe',type:'badge',category:'crypto',inspiration:'Dogecoin culture',series:'Chain Signals',name:'Dogecoin',aliases:['Moon Shibe'],description:'A tiny brass dog watching a crescent moon. Such profile. Much night.',finish:'Satin brass'},
 {id:'coin-blockchain',type:'badge',category:'crypto',series:'Chain Signals',inspiration:'Blockchain.com wallet culture',name:'Blockchain',description:'A web-sourced blockchain mark for the chain-signal collection. A free profile decoration; it does not connect a wallet or attest to holdings.',finish:'Credited source artwork'},
 {id:'coin-ledger',type:'badge',category:'crypto',series:'Chain Signals',inspiration:'Ledger hardware-wallet culture',name:'Ledger',description:'Ledger hardware-wallet culture, using credited web artwork. A free profile decoration with no wallet connection, recovery-phrase entry or official account status.',finish:'Credited source artwork'},
 {id:'coin-diamondhands',type:'badge',category:'crypto',inspiration:'Diamond-hands meme',series:'Chain Signals',name:'Diamond Hands',description:'Two steel hands hold one cold little crystal. The commitment is purely decorative.',finish:'Ice crystal and steel'},
 {id:'meme-grass',type:'badge',category:'memes',series:'Internet Relics',name:'Touch Grass',description:'A small patch of jade grass. A gentle reminder that outside still exists.',finish:'Jade enamel'},
 {id:'meme-npc',type:'badge',category:'memes',series:'Internet Relics',name:'NPC Energy',description:'An expressionless little face with a perfectly rehearsed dialogue bubble.',finish:'Matte porcelain'},
 {id:'meme-yapper',type:'badge',category:'memes',series:'Internet Relics',name:'Certified Yapper',description:'A chrome microphone for the person who always has one more thing to say.',finish:'Chrome and oxide enamel'},
 {id:'meme-copium',type:'badge',category:'memes',series:'Internet Relics',name:'Copium Reserve',description:'A green glass canister for when the group chat needs an unreasonable amount of optimism.',finish:'Bottle-green glass'},
 {id:'meme-cooked',type:'badge',category:'memes',series:'Internet Relics',name:'Absolutely Cooked',description:'A tiny pan with a very ambitious flame. We have all been there.',finish:'Cast iron and amber'},
 {id:'meme-terminal',type:'badge',category:'memes',series:'Internet Relics',name:'Chronically Online',description:'A small terminal still glowing long after everyone said goodnight.',finish:'Phosphor glass'} ,
 {id:'ego-unique-one',type:'badge',category:'ego',series:'Ego Archive',inspiration:'Max Stirner · an original profile after Engels’ 1892 memory sketch',name:'Max Stirner',aliases:['The Unique One'],description:'A long-nosed ivory profile, one round lens and a collar held a little too high. An original cameo after the familiar Stirner portrait.',finish:'Ivory enamel and oxidised silver'},
 {id:'ego-ownness',type:'badge',category:'ego',series:'Ego Archive',inspiration:'Stirner’s concept of ownness',name:'Ownness Seal',description:'Oxblood wax holds a torn bookplate together while its ornamental frame quietly comes apart. No borrowed quotation required.',finish:'Wax, cream paper and nickel'},
 {id:'ego-spook-breaker',type:'badge',category:'ego',series:'Ego Archive',inspiration:'Egoist marginalia and philosophical spooks',name:'Spook Breaker',description:'A paper specter rises from a dog-eared volume. The spectacles stay on the cover; the frame fails to contain the page.',finish:'Parchment and smoke-grey ink'},
 {id:'meme-nothing-happens',type:'badge',category:'memes',series:'Internet Relics',inspiration:'Nothing ever happens · an original Chudjak curtain scene',name:'Chudjak',aliases:['Nothing Ever Happens'],description:'A bespectacled deadpan figure checks the window, closes the teal curtains, and leaves just enough room for one more look.',finish:'Teal enamel, warm ivory and graphite'},
 {id:'meme-final-reply',type:'badge',category:'memes',series:'Internet Relics',inspiration:'Reply-guy culture',name:'Reply Guy',aliases:['Final Reply'],description:'One raised eyebrow, thick glasses and a reply strip that has absolutely one last point. The speech-bubble rim is already cracked.',finish:'Chalk enamel and tarnished nickel'},
 {id:'meme-aura-receipt',type:'badge',category:'memes',series:'Internet Relics',inspiration:'Fictional aura-point jokes',name:'Aura Receipt',description:'A thermal receipt curls over a tiny mechanical counter. The imaginary total is decorative; nobody is being scored.',finish:'Thermal paper and black ceramic'},
 {id:'meme-aura-farmer',type:'badge',category:'memes',series:'Internet Relics',inspiration:'Aura-farming jokes',name:'Aura Farmer',description:'An uneven green sprout leans through a brushed ring toward a passing light. The pot takes the whole operation very seriously.',finish:'Ceramic, jade leaves and brushed steel'},
 {id:'meme-locked-in-alien',type:'badge',category:'memes',series:'Internet Relics',inspiration:'Locked-in alien reaction imagery',name:'Locked-In Alien',description:'A long celadon cranium, heavy asymmetric eyelids and an unnervingly focused stare. Four steel corners finally line up.',finish:'Celadon enamel and dark steel'},
 {id:'meme-six-seven',type:'badge',category:'memes',series:'Internet Relics',inspiration:'Six-seven alternating-palms gesture',name:'Six / Seven',description:'Two small palms weigh the matter, twice, and arrive at no further explanation. The numeral charms settle level.',finish:'Warm ivory enamel and dull chrome'},
 {id:'meme-dilly-dally',type:'badge',category:'memes',series:'Internet Relics',inspiration:'Born to dilly-dally, forced to lock in',name:'Dilly Dally',description:'A loose-lanyard snail clocks in on a punched timecard. Forced to lock in, at its own pace.',finish:'Lavender enamel, paper and cloth'},
 {id:'guild-cardboard-paladin',type:'badge',category:'guild',series:'Afterhours Guild',inspiration:'Homemade LARP equipment',name:'Cardboard Paladin',description:'Corrugated layers, cream stitches and one dull-blue cloth star. The tape repair is part of the heraldry.',finish:'Cardboard, cloth and orange tape'},
 {id:'guild-guildless-knight',type:'badge',category:'guild',series:'Afterhours Guild',inspiration:'Guildless character-sheet humor',name:'Guildless Knight',description:'A narrow visor opens onto empty space. A safety pin keeps the blank crimson name ribbon attached.',finish:'Brushed steel, faded cloth and brass'},
 {id:'guild-side-quest',type:'badge',category:'guild',series:'Afterhours Guild',inspiration:'Side-quest-only play',name:'Side Quest Only',description:'A blunt compass, a foam-sword marker and a folded map containing one entirely unnecessary detour.',finish:'Cream paper and worn brass'},
 {id:'coin-cold-storage',type:'badge',category:'crypto',series:'Chain Signals',inspiration:'Hardware-wallet culture',name:'Cold Storage',description:'A small steel hardware-device sculpture in a frosted sleeve. Artwork only: it has no wallet connection or key-entry function.',finish:'Brushed steel and frosted glass'},
 {id:'coin-genesis-block',type:'badge',category:'crypto',series:'Chain Signals',inspiration:'Genesis-block imagery',name:'Genesis Block',description:'Three ledger plates align inside a transparent cuboid. A single copper corner anchors the dark base.',finish:'Clear glass, graphite and copper'},
 {id:'coin-moon-pending',type:'badge',category:'crypto',series:'Chain Signals',inspiration:'To-the-moon internet humor',name:'Moon Pending',description:'A dented tin rocket rises until its loose cable remembers the crescent moon. No destination or price prediction is promised.',finish:'Ivory enamel, tin and orange lacquer'},
 {id:'gift-rose',type:'gift',name:'Chrome Rose',description:'A rose that needs no water. Its petals are folded from bright metal.',finish:'Rose chrome'},
 {id:'gift-cassette',type:'gift',name:'Midnight Tape',description:'A tiny mixtape for someone whose company you like.',finish:'Smoked glass'},
 {id:'gift-star',type:'gift',name:'Pocket Star',description:'A five-point star, carefully wrapped for its next home.',finish:'Lilac crystal'},
 {id:'gift-cup',type:'gift',name:'Afterhours Cup',description:'One more cup, then we should probably get some sleep.',finish:'Glazed ceramic'},
 {id:'gift-ghost',type:'gift',name:'Paper Ghost',description:'A friendly little ghost folded from pearlescent paper.',finish:'Pearl paper'},
 {id:'gift-parcel',type:'gift',name:'Small Surprise',description:'A midnight-blue parcel with a silver ribbon. Just because.',finish:'Velvet and foil'},
 {id:'gift-seraph',type:'gift',name:'Chrome Seraph',description:'Brushed silver wings sheltering a small ice-blue core.',finish:'Silver and enamel'},
 {id:'gift-key',type:'gift',name:'Obsidian Key',description:'An engraved key cut from dark glass, with one warm brass tooth.',finish:'Obsidian glass'},
 {id:'gift-halo',type:'gift',name:'Broken Halo',description:'A fractured ring held together by three tiny enamel bridges.',finish:'Gilded enamel'},
 {id:'gift-orchid',type:'gift',name:'Midnight Orchid',description:'A dark orchid with violet petals and a fine gold centre.',finish:'Violet ceramic'},
 {id:'gift-signal',type:'gift',name:'Sealed Signal',description:'A folded silver envelope sealed with a small jade wax mark.',finish:'Foil and jade wax'},
 {id:'gift-ticket',type:'gift',name:'Afterhours Ticket',description:'A worn admission ticket held by a precise chrome clip. No closing time.',finish:'Paper and chrome'},
 {id:'gift-ego-volume',type:'gift',series:'Ego Archive',name:'Egoist’s Volume',description:'A black-cloth volume with an ivory cameo, untrimmed paper and an oxblood bookmark. Its annotation is original; the page is yours to turn.',finish:'Book cloth, ivory and paper'},
 {id:'gift-curtain-call',type:'gift',series:'Internet Relics',name:'Curtain Call',description:'A graphite window diorama, a brass rail and an original bespectacled figure taking one last sideways look before closing the teal curtains.',finish:'Graphite, teal cloth and brass'},
 {id:'gift-larp-kit',type:'gift',series:'Afterhours Guild',name:'LARP Starter Kit',description:'A worn theatrical case holding a foam sword, taped cardboard helmet and rolled campaign map. The contents are fixed and visible before sending.',finish:'Case cloth, cardboard and painted foam'},
 {id:'gift-aura-meter',type:'gift',series:'Internet Relics',name:'Aura Meter',description:'A scratched analog meter with an ivory dial, loose screw and an excessively confident brass needle. Its reading is an imaginary cosmetic joke.',finish:'Dark steel, ivory and brass'},
 {id:'gift-copium-tank',type:'gift',series:'Internet Relics',name:'Copium Reserve Tank',description:'A squat bottle-green vessel with a short hose and inset gauge. One bubble rises; optimism remains entirely fictional.',finish:'Bottle-green glass and brushed metal'},
 {id:'gift-cold-wallet',type:'gift',series:'Chain Signals',name:'Cold Wallet Relic',description:'An original hardware-device sculpture rests in dark felt inside a folded steel case. No seed phrase, private key or wallet connection is ever requested.',finish:'Steel, black felt and frosted glass'},
 {id:'gift-block-zero',type:'gift',series:'Chain Signals',name:'Block Zero',description:'Interlocking ledger plates sit inside a substantial transparent block, grounded by a small copper plaque. A mechanical object, not a financial asset.',finish:'Optical glass, graphite and copper'},
 {id:'gift-last-tab',type:'gift',series:'Internet Relics',name:'Last Tab Open',description:'A worn CRT terminal with a bent antenna, tiny keyboard and one amber power light. Still here, after the last tab should have closed.',finish:'Worn plastic, phosphor glass and steel'},
 {id:'meme-doomer',type:'badge',category:'memes',series:'Internet Relics',inspiration:'Doomer internet-character culture',name:'Doomer',description:'A tired beanie-wearing face, a high collar and one last illuminated window. An original late-night character study.',finish:'Charcoal enamel, wool texture and nickel'},
 {id:'meme-bloomer',type:'badge',category:'memes',series:'Internet Relics',inspiration:'Bloomer internet-character culture',name:'Bloomer',description:'A quiet half-smile, an open collar and a new leaf growing into the frame. A little optimism, drawn in ivory and green.',finish:'Ivory enamel, jade and brushed brass'},
 {id:'meme-absolute-cinema',type:'badge',category:'memes',series:'Internet Relics',inspiration:'Absolute cinema reaction meme',name:'Absolute Cinema',description:'An original bespectacled figure raises both hands above a miniature director’s chair. A frame of pure appreciation.',finish:'Chalk enamel, black cloth and nickel'},
 {id:'guild-forum-wizard',type:'badge',category:'guild',series:'Afterhours Guild',inspiration:'Old-forum wizard humor',name:'Forum Wizard',description:'A pointed cloth hat, an unusually serious keyboard and a very well-worn sleeve. The spell is probably another forum reply.',finish:'Worn violet cloth, ivory keys and steel'},
 {id:'gift-pocket-doomer',type:'gift',series:'Internet Relics',name:'Pocket Doomer',description:'A small original night-shift figure in a folded coat, carrying a warm window light. Built to sit quietly on a profile shelf.',finish:'Charcoal enamel, wool and warm glass'},
 {id:'gift-orbit-mobile',type:'gift',series:'Afterhours Objects',name:'Orbit Mobile',description:'A tiny suspended moon, satellite and counterweight hang from a bent metal arm. Each piece settles at its own pace.',finish:'Brushed steel, ivory enamel and fine wire'},
 {id:'gift-last-broadcast',type:'gift',series:'Internet Relics',name:'Last Broadcast',description:'A worn little receiver with a bent antenna, tactile dial and a warm frequency window. One final signal before morning.',finish:'Dark alloy, ivory dial and amber glass'},
 {id:'gift-night-lantern',type:'gift',series:'Afterhours Objects',name:'Night Lantern',description:'A sheltered warm lamp inside a graphite frame with a hinged handle and worn brass catch. Small company for a late desk.',finish:'Graphite steel, brass and warm glass'},
 {id:'meme-chud',type:'badge',category:'memes',series:'Internet Relics',name:'CHUD',description:'The familiar stubborn internet stare, drawn as an original enamel portrait with heavy brows and a clenched expression.',finish:'Bone enamel and dark nickel'},
 {id:'meme-wojak',type:'badge',category:'memes',series:'Internet Relics',name:'Wojak',description:'The quiet, tired face that has seen far too much of the internet. Original ink construction, no invented rank.',finish:'Pearl porcelain and graphite'},
 {id:'meme-soyjak',type:'badge',category:'memes',series:'Internet Relics',name:'Soyjak',description:'Wide eyes, heavy glasses and an exaggerated open-mouthed reaction, caught in a small original pin.',finish:'Chalk enamel and black ink'},
 {id:'meme-gigachad',type:'badge',category:'memes',series:'Internet Relics',name:'Gigachad',description:'A deliberately dramatic squared-jaw portrait with directional black-and-white planes and a very composed expression.',finish:'Monochrome enamel and steel'},
 {id:'meme-cope-seethe',type:'badge',category:'memes',series:'Internet Relics',name:'Cope & Seethe',description:'One tiny gritted-teeth reaction, with eyes and brows doing their best to keep it together.',finish:'Warm porcelain and oxide enamel'},
 {id:'meme-pepe',type:'badge',category:'memes',series:'Internet Relics',name:'Pepe',description:'A recognizable frog expression interpreted as a new little enamel portrait. Mood, rather than status.',finish:'Jade enamel and tarnished nickel'},
 ...Object.entries(cartridgeDesigns).map(([id,design])=>({id,...design,type:'gift',acquisition:'Claim one free copy or send a free gift to someone.'})),
 ...Object.values(giftBases).map(({referenceKey,...item})=>({...item,type:'gift',category:'gifts',inspiration:'Original VOIDLINE design with researched collectible-gift staging',acquisition:'Free VOIDLINE cosmetic instance. Original artwork and choreography; no blockchain asset changes hands.'}))
].map(item=>{
 const model=collectibleDisplay(item.id,item.name),curated=legacyPresentations[item.id],source=curated?undefined:webSources[item.id];
 const artwork=source?{sourceURL:source.sourceURL,creator:source.creator,license:source.license,licenseURL:source.licenseURL,changes:source.changes,components:source.components||[]}:undefined;
 const acquisition=item.type==='gift'?(curated?'Free VOIDLINE cosmetic instance with original workshop artwork. No blockchain asset changes hands.':source?'Free VOIDLINE cosmetic instance with credited web artwork. No blockchain asset changes hands.':item.acquisition):item.acquisition;
 return Object.freeze({category:item.type==='gift'?'gifts':'originals',series:item.type==='gift'?'Afterhours Objects':'VOIDLINE Originals',...item,...model,...(item.id==='gift-copium-cartridge'?{relatedSeries:cartridgeSeries}:{}),finish:model.material||item.finish,...(artwork?{artwork}:{}),price:0,acquisition:acquisition||(item.category==='crypto'?'Free profile decoration inspired by crypto culture. No coins, wallet holdings or official affiliation.':'Free to collect. Cosmetic only; no staff role or verified achievement.')});
}).concat(capsuleCatalogItems().map(Object.freeze)));
const legacyGiftIds=JSON.stringify(COSMETICS.filter(i=>i.type==='gift'&&i.acquisitionPolicy==='legacy-free').map(i=>i.id));
const catalog=new Map(COSMETICS.map(c=>[c.id,c]));
const q=(db,sql,...values)=>db.prepare(sql).bind(...values);
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const need=(ok,status,code,message)=>{if(!ok)throw new AuthError(status,code,message);};
// Evaluate access again inside each write: requests authenticated before Block,
// Delete or session revocation must not restore private account state afterward.
const databaseNow="CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)";
function mutationGuard(user){return {sql:`EXISTS(SELECT 1 FROM auth_sessions s JOIN live_accounts a ON a.id=s.account_id WHERE s.id=? AND s.account_id=? AND s.revoked_at IS NULL AND s.expires_at>${databaseNow} AND a.account_status='active')`,binds:[user.sessionId,user.id]};}
async function requireCurrentActor(db,user){const guard=mutationGuard(user);need(await q(db,'SELECT 1 AS allowed WHERE '+guard.sql,...guard.binds).first(),409,'account_changed','Your account or session changed. Sign in again before changing your collection.');}
async function bodyJSON(request){
 need(request.headers.get('content-type')?.split(';')[0].trim()==='application/json',415,'json_required','Use a JSON request.');
 need(Number(request.headers.get('content-length')||0)<=4096,413,'body_too_large','This request is too large.');
 const reader=request.body?.getReader();need(reader,400,'invalid_body','A request body is required.');let size=0;const chunks=[];
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();throw new AuthError(413,'body_too_large','This request is too large.');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}const text=new TextDecoder().decode(bytes);
 let body;try{body=JSON.parse(text);}catch{throw new AuthError(400,'invalid_body','The request could not be read.');}
 need(body&&typeof body==='object'&&!Array.isArray(body),400,'invalid_body','Use a JSON object.');return body;
}
function itemFor(id,type){const item=catalog.get(id);need(item&&(!type||item.type===type),400,'unknown_cosmetic','Choose an item from the collection.');return item;}
const giftColumns=`g.id,g.catalog_id,g.sender_id,g.recipient_id,g.state,g.created_at,g.opened_at,s.display_name AS sender_name,s.username AS sender_username,r.display_name AS recipient_name,r.username AS recipient_username`;
const giftJoins=`FROM cosmetic_gifts g JOIN live_accounts s ON s.id=g.sender_id JOIN live_accounts r ON r.id=g.recipient_id`;
export const BADGE_DEFINITIONS=Object.freeze([
 {id:'profile-authored',name:'Profile Authored',description:'A profile made deliberately your own.',requirement:'Save a bio of at least 20 characters and change your avatar, banner or accent from its default.',rule:'profile-authored',active:1},
 {id:'reviewed-contribution',name:'Community Contribution',description:'A contribution reviewed and acknowledged by the platform owner.',requirement:'A substantive contribution reviewed by the verified platform owner.',rule:'reviewed-contribution',active:1}
]);
export async function effectiveCatalog(db){
 const overrides=(await q(db,'SELECT id,name,description,active FROM gift_catalog').all()).results;
 return COSMETICS.map(item=>{const override=overrides.find(row=>row.id===item.id);return {...item,...(override&&item.acquisitionPolicy!=='capsule-only'?{name:override.name,description:override.description,active:!!override.active}:{active:true})};});
}
export async function relationship(db,viewer,target){
 if(viewer===target)return {own:true,friends:true,shared:true,blocked:false};
 const blocked=!!await q(db,'SELECT 1 AS found FROM social_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?) LIMIT 1',viewer,target,target,viewer).first();
 if(blocked)return {own:false,friends:false,shared:false,blocked:true};
 const friends=!!await q(db,"SELECT 1 AS found FROM social_requests WHERE state='accepted' AND ((sender_id=? AND recipient_id=?) OR(sender_id=? AND recipient_id=?)) LIMIT 1",viewer,target,target,viewer).first();
 const shared=!!await q(db,'SELECT 1 AS found FROM live_memberships a JOIN live_memberships b ON a.community_id=b.community_id WHERE a.account_id=? AND b.account_id=? LIMIT 1',viewer,target).first();
 return {own:false,friends,shared,blocked:false};
}
export const mayView=(visibility,relation)=>!relation.blocked&&(relation.own||visibility==='public'||visibility==='friends'&&relation.friends||visibility==='shared'&&(relation.friends||relation.shared));
export async function earnedBadges(db,userId){
 return (await q(db,`SELECT a.id,a.badge_id,a.issued_at,a.revoked_at,a.reason,d.name,d.description,d.requirement,d.rule,a.issuer_id,i.display_name AS issuer_name
 FROM badge_awards a JOIN badge_definitions d ON d.id=a.badge_id LEFT JOIN live_accounts i ON i.id=a.issuer_id
 WHERE a.account_id=? AND a.revoked_at IS NULL AND d.active=1 ORDER BY a.issued_at,a.id`,userId).all()).results.map(row=>({...row,issuer:row.issuer_id?'Reviewed by '+(row.issuer_name||'platform owner'):'VOIDLINE server rule',valid:true}));
}
async function materializeLegacy(db,user,now){
 const userId=user.id,actor=mutationGuard(user);
 // Only the legacy grant catalog participates in historical reconciliation.
 // Deterministic IDs reconcile only existing authoritative server records.
 // A transferred instance retains that ID, so a later refresh cannot mint it again.
 await db.batch([
 q(db,`INSERT OR IGNORE INTO gift_instances(id,catalog_id,owner_id,origin_gift_id,origin_kind,created_at,arrival_acknowledged_at)
 SELECT 'gift:'||g.id,g.catalog_id,g.recipient_id,g.id,'gift',COALESCE(g.opened_at,g.created_at),COALESCE(g.opened_at,g.created_at) FROM cosmetic_gifts g
 WHERE g.recipient_id=? AND g.catalog_id IN (SELECT value FROM json_each(?)) AND g.state='opened' AND ${actor.sql} AND NOT EXISTS(SELECT 1 FROM gift_instances i WHERE i.origin_gift_id=g.id) `,userId,legacyGiftIds,...actor.binds),
 q(db,`INSERT OR IGNORE INTO gift_instances(id,catalog_id,owner_id,origin_kind,created_at,arrival_acknowledged_at)
 SELECT 'claim:'||o.account_id||':'||o.cosmetic_id,o.cosmetic_id,o.account_id,'legacy-claim',o.claimed_at,o.claimed_at FROM cosmetic_ownership o
 WHERE o.account_id=? AND o.cosmetic_id IN (SELECT value FROM json_each(?)) AND ${actor.sql} AND NOT EXISTS(SELECT 1 FROM cosmetic_gifts g WHERE g.recipient_id=o.account_id AND g.catalog_id=o.cosmetic_id AND g.state='opened')`,userId,legacyGiftIds,...actor.binds)
 ]);
}
async function inventory(db,user){
 const userId=user.id;await materializeLegacy(db,user,Date.now());
 const [owned,profile,pending,instances,preferences,showcase,awards,aggregate]=await Promise.all([
  q(db,'SELECT cosmetic_id,claimed_at FROM cosmetic_ownership WHERE account_id=? ORDER BY claimed_at,cosmetic_id',userId).all(),
  q(db,'SELECT equipped_id,gifts_enabled FROM cosmetic_profiles WHERE account_id=?',userId).first(),
  q(db,"SELECT (SELECT COUNT(*) FROM cosmetic_gifts WHERE recipient_id=? AND state='pending')+(SELECT COUNT(*) FROM gift_transfers WHERE recipient_id=? AND state='pending') AS n",userId,userId).first(),
  q(db,`SELECT id,catalog_id,${acquisitionKind()} AS origin_kind,${acquisitionTime()} AS created_at,${acquisitionTime()} AS acquired_at,ownership_revision,pending_transfer_id,arrival_acknowledged_at FROM gift_instances i WHERE owner_id=? ORDER BY acquired_at DESC,id LIMIT 200`,userId).all(),
  q(db,'SELECT collection_visibility,full_inventory_visibility,badge_order FROM profile_preferences WHERE account_id=?',userId).first(),
  q(db,'SELECT slot,instance_id,show_sender,featured FROM gift_showcase WHERE account_id=? ORDER BY slot',userId).all(),earnedBadges(db,userId),inventorySummary(db,userId)
 ]);
 await requireCurrentActor(db,user);
 const currentOwned=[...owned.results.filter(row=>catalog.get(row.cosmetic_id)?.type==='badge'),...aggregate.designs];
 return {owned:currentOwned,claimedDesigns:owned.results.map(row=>row.cosmetic_id),summary:aggregate.summary,fullInventoryVisibility:preferences?.full_inventory_visibility||'private',equippedId:profile?.equipped_id||null,giftsEnabled:profile?.gifts_enabled!==0,pendingGifts:pending.n,instances:instances.results.map(i=>({...i,is_new:i.arrival_acknowledged_at===null})),instanceLimit:200,collectionVisibility:preferences?.collection_visibility||'shared',showcase:showcase.results,earnedBadges:awards,badgeOrder:JSON.parse(preferences?.badge_order||'[]')};
}
async function requireRecipient(db,userId,username){
 const recipient=await q(db,"SELECT a.id,a.username,a.display_name,a.avatar,p.gifts_enabled FROM live_accounts a LEFT JOIN cosmetic_profiles p ON p.account_id=a.id WHERE a.username=? AND a.onboarding_complete=1 AND a.account_status='active'",normalizeUsername(username)).first();
 need(recipient&&recipient.gifts_enabled!==0&&recipient.id!==userId,404,'recipient_unavailable','This username is unavailable for gifts.');
 need(!(await relationship(db,userId,recipient.id)).blocked,404,'recipient_unavailable','This username is unavailable for gifts.');return recipient;
}
export async function handleCosmeticsRequest(request,env){
 try{
  const url=new URL(request.url),path=url.pathname.replace(/^\/api\/cosmetics\/?/,'').split('/').filter(Boolean),method=request.method;
  need(url.pathname.startsWith('/api/cosmetics/'),404,'not_found','This collection page is unavailable.');
  need(['GET','POST'].includes(method),405,'method_not_allowed','This action is unavailable.');
  const user=await authenticate(request,env),db=env.DB,now=Date.now(),actor=mutationGuard(user);
  let body;if(method==='POST'){body=await bodyJSON(request);await validateSessionMutation(request,user,body);await authRateLimit(request,db,'cosmetics',60,now,user.id);}
  if(path.length===1&&path[0]==='catalog'&&method==='GET')return json({items:await effectiveCatalog(db),free:true});
  if(path.length===1&&path[0]==='inventory'&&method==='GET')return json(await inventory(db,user));
  if(path.length===1&&path[0]==='recipient'&&method==='GET'){await authRateLimit(request,db,'gift-recipient',60,now,user.id);const recipient=await requireRecipient(db,user.id,url.searchParams.get('username'));return json({recipient:{id:recipient.id,username:recipient.username,displayName:recipient.display_name,avatar:recipient.avatar}});}
  if(path.length===1&&path[0]==='claim'&&method==='POST'){
   const item=itemFor(body.cosmeticId);need(item.acquisitionPolicy==='legacy-free',409,'capsule_only','This model comes from an earned capsule or an existing copy.');need((await effectiveCatalog(db)).find(i=>i.id===item.id)?.active,409,'item_retired','This item is not available for a new grant.');
   const previous=await q(db,'SELECT 1 AS found FROM cosmetic_ownership WHERE account_id=? AND cosmetic_id=?',user.id,item.id).first();
   if(item.type==='gift'&&previous){await materializeLegacy(db,user,now);need(await q(db,'SELECT 1 AS found FROM gift_instances WHERE owner_id=? AND catalog_id=?',user.id,item.id).first(),409,'claim_used','You already used this design’s free claim. You can receive another instance as a gift.');}
   await db.batch([q(db,"INSERT OR IGNORE INTO cosmetic_ownership(account_id,cosmetic_id,claimed_at) SELECT ?,?,? WHERE "+actor.sql+" AND NOT EXISTS(SELECT 1 FROM gift_catalog WHERE id=? AND active=0) AND NOT EXISTS(SELECT 1 FROM collectible_model_policies WHERE model_id=?)",user.id,item.id,now,...actor.binds,item.id,item.id),...(item.type==='gift'?[q(db,"INSERT OR IGNORE INTO gift_instances(id,catalog_id,owner_id,origin_kind,created_at) SELECT ?,?,?,'claim',? WHERE EXISTS(SELECT 1 FROM cosmetic_ownership WHERE account_id=? AND cosmetic_id=?) AND "+actor.sql+" AND NOT EXISTS(SELECT 1 FROM gift_catalog WHERE id=? AND active=0)",'claim:'+user.id+':'+item.id,item.id,user.id,now,user.id,item.id,...actor.binds,item.id)]:[])]);
   await requireCurrentActor(db,user);const committed=await inventory(db,user);need(committed.owned.some(row=>row.cosmetic_id===item.id),409,'claim_unavailable','This item became unavailable before the claim completed.');return json({claimed:true,...committed});
  }
  if(path.length===1&&path[0]==='equip'&&method==='POST'){
   const id=body.cosmeticId;
   if(id!==null){itemFor(id,'badge');need(await q(db,'SELECT 1 AS found FROM cosmetic_ownership WHERE account_id=? AND cosmetic_id=?',user.id,id).first(),403,'not_owned','Collect this badge before equipping it.');}
   const ownedSql=id===null?'1=1':'EXISTS(SELECT 1 FROM cosmetic_ownership WHERE account_id=? AND cosmetic_id=?)';
   const equipped=await q(db,'INSERT INTO cosmetic_profiles(account_id,equipped_id) SELECT ?,? WHERE '+actor.sql+' AND '+ownedSql+' ON CONFLICT(account_id) DO UPDATE SET equipped_id=excluded.equipped_id',user.id,id,...actor.binds,...(id===null?[]:[user.id,id])).run();
   need(equipped.meta?.changes>0,409,'collection_changed','Your account, session or badge ownership changed. Refresh before trying again.');
   return json({equipped:true,...await inventory(db,user)});
  }
  if(path.length===1&&path[0]==='settings'&&method==='POST'){
   need(body.giftsEnabled!==undefined||body.collectionVisibility!==undefined||body.fullInventoryVisibility!==undefined,400,'invalid_setting','Choose a collection preference.');
   if(body.giftsEnabled!==undefined)need(typeof body.giftsEnabled==='boolean',400,'invalid_setting','Choose whether to receive gifts.');
   if(body.collectionVisibility!==undefined)need(['public','shared','friends','private'].includes(body.collectionVisibility),400,'invalid_visibility','Choose a collection visibility.');
   if(body.fullInventoryVisibility!==undefined)need(['public','shared','friends','private'].includes(body.fullInventoryVisibility),400,'invalid_visibility','Choose who can browse your full inventory.');
   const results=await db.batch([...(body.fullInventoryVisibility!==undefined?[q(db,'INSERT INTO profile_preferences(account_id,full_inventory_visibility,updated_at) SELECT ?,?,? WHERE '+actor.sql+' ON CONFLICT(account_id) DO UPDATE SET full_inventory_visibility=excluded.full_inventory_visibility,updated_at=excluded.updated_at',user.id,body.fullInventoryVisibility,now,...actor.binds)]:[]),...(body.giftsEnabled!==undefined?[q(db,'INSERT INTO cosmetic_profiles(account_id,gifts_enabled) SELECT ?,? WHERE '+actor.sql+' ON CONFLICT(account_id) DO UPDATE SET gifts_enabled=excluded.gifts_enabled',user.id,body.giftsEnabled?1:0,...actor.binds)]:[]),...(body.collectionVisibility!==undefined?[q(db,'INSERT INTO profile_preferences(account_id,collection_visibility,updated_at) SELECT ?,?,? WHERE '+actor.sql+' ON CONFLICT(account_id) DO UPDATE SET collection_visibility=excluded.collection_visibility,updated_at=excluded.updated_at',user.id,body.collectionVisibility,now,...actor.binds)]:[])]);
   need(results.every(result=>result.meta?.changes>0),409,'account_changed','Your account or session changed. Sign in again before saving collection preferences.');
   return json(await inventory(db,user));
  }
  if(path.length===2&&path[0]==='profiles'&&method==='GET'){
   const id=decodeURIComponent(path[1]);
   const blocked=id!==user.id&&await q(db,'SELECT 1 AS found FROM social_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?) LIMIT 1',user.id,id,id,user.id).first();
   const allowed=!blocked&&(id===user.id||await q(db,'SELECT 1 AS found FROM live_memberships a JOIN live_memberships b ON a.community_id=b.community_id WHERE a.account_id=? AND b.account_id=? LIMIT 1',user.id,id).first()||await q(db,"SELECT 1 AS found FROM social_requests WHERE state='accepted' AND ((sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?)) LIMIT 1",user.id,id,id,user.id).first());
   need(allowed,403,'profile_unavailable','This profile is unavailable.');
   const profile=await q(db,'SELECT equipped_id FROM cosmetic_profiles WHERE account_id=?',id).first();
   return json({equippedId:profile?.equipped_id||null});
  }
  if(path.length===1&&path[0]==='gifts'&&method==='GET'){
   const box=url.searchParams.get('box')==='sent'?'sent':'inbox',offset=Number(url.searchParams.get('offset')||0);
   need(Number.isSafeInteger(offset)&&offset>=0,400,'invalid_page','Choose a valid page.');
   const column=box==='sent'?'sender_id':'recipient_id';
   const total=(await q(db,`SELECT COUNT(*) AS n FROM cosmetic_gifts WHERE ${column}=?`,user.id).first()).n;
   const rows=(await q(db,`SELECT ${giftColumns} ${giftJoins} WHERE g.${column}=? ORDER BY g.created_at DESC,g.id DESC LIMIT 30 OFFSET ?`,user.id,offset).all()).results;
   return json({gifts:rows,total,box,page:{offset,limit:30,hasMore:offset+rows.length<total}});
  }
  if(path.length===1&&path[0]==='gifts'&&method==='POST'){
   need(!body.message,503,'private_note_unavailable','Private gift notes require an encrypted messaging connection and cannot be sent here.');
   const item=itemFor(body.catalogId,'gift');need(item.acquisitionPolicy==='legacy-free',409,'capsule_only','This model can only be sent as an owned copy.');need((await effectiveCatalog(db)).find(i=>i.id===item.id)?.active,409,'item_retired','This gift is not available for a new grant.');
   need(typeof body.clientId==='string'&&/^[A-Za-z0-9_-]{8,100}$/.test(body.clientId),400,'invalid_client_id','Use a stable gift request ID.');
   const username=normalizeUsername(body.username);
   const previous=await q(db,'SELECT g.*,a.username AS recipient_username FROM cosmetic_gifts g JOIN live_accounts a ON a.id=g.recipient_id WHERE sender_id=? AND client_id=?',user.id,body.clientId).first();
   if(previous){need(previous.catalog_id===item.id&&(body.recipientId?body.recipientId===previous.recipient_id:previous.recipient_username===username),409,'retry_conflict','That gift request ID already belongs to a different gift.');await requireCurrentActor(db,user);return json({gift:previous,acknowledged:true});}
   const recipient=await q(db,"SELECT a.id,a.username,a.display_name,a.avatar,p.gifts_enabled FROM live_accounts a LEFT JOIN cosmetic_profiles p ON p.account_id=a.id WHERE a.username=? AND a.onboarding_complete=1 AND a.account_status='active'",username).first();
   need(recipient&&recipient.gifts_enabled!==0,404,'recipient_unavailable','This username is unavailable for gifts.');
   need(!body.recipientId||typeof body.recipientId==='string'&&body.recipientId===recipient.id,409,'recipient_changed','The recipient identity changed. Review this gift again before sending.');
   const blocked=await q(db,'SELECT 1 AS found FROM social_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?) LIMIT 1',user.id,recipient.id,recipient.id,user.id).first();
   need(!blocked,404,'recipient_unavailable','This username is unavailable for gifts.');
   need(recipient.id!==user.id,400,'gift_to_self','Use Add to collection to keep a gift for yourself.');
   const id=crypto.randomUUID();
   // Conditional insertion enforces limits at the same database operation as
   // creation; retries retain the original request and never send twice.
   await q(db,`INSERT OR IGNORE INTO cosmetic_gifts(id,sender_id,recipient_id,catalog_id,client_id,state,created_at)
    SELECT ?,?,?,?,?,'pending',? WHERE
    (SELECT COUNT(*) FROM cosmetic_gifts WHERE sender_id=? AND created_at>?)<10 AND
    (SELECT COUNT(*) FROM cosmetic_gifts WHERE sender_id=? AND recipient_id=? AND created_at>?)<3 AND
    (SELECT COUNT(*) FROM live_accounts WHERE id IN (?,?) AND account_status='active')=2 AND
    NOT EXISTS(SELECT 1 FROM gift_catalog WHERE id=? AND active=0) AND NOT EXISTS(SELECT 1 FROM collectible_model_policies WHERE model_id=?) AND
    NOT EXISTS(SELECT 1 FROM cosmetic_profiles WHERE account_id=? AND gifts_enabled=0) AND
    NOT EXISTS(SELECT 1 FROM social_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)) AND ${actor.sql}`,id,user.id,recipient.id,item.id,body.clientId,now,user.id,now-3600000,user.id,recipient.id,now-86400000,user.id,recipient.id,item.id,item.id,recipient.id,user.id,recipient.id,recipient.id,user.id,...actor.binds).run();
   await requireCurrentActor(db,user);const gift=await q(db,'SELECT * FROM cosmetic_gifts WHERE sender_id=? AND client_id=?',user.id,body.clientId).first();
   need(gift,429,'gift_limit','The recipient became unavailable or a gift limit was reached. You can send up to 10 new gifts per hour and 3 to the same person per day.');
   need(gift.catalog_id===item.id&&gift.recipient_id===recipient.id,409,'retry_conflict','That request ID already belongs to a different gift.');
   return json({gift,acknowledged:true},201);
  }
  if(path.length===3&&path[0]==='gifts'&&['open','decline'].includes(path[2])&&method==='POST'){
   const gift=await q(db,'SELECT * FROM cosmetic_gifts WHERE id=? AND recipient_id=?',path[1],user.id).first();
   need(gift,404,'gift_unavailable','This gift is unavailable.');
   const opening=path[2]==='open';
   if(opening)need(catalog.get(gift.catalog_id)?.acquisitionPolicy==='legacy-free',409,'invalid_grant','This request is unavailable for a new grant.');
   if(opening){const blocked=await q(db,'SELECT 1 AS found FROM social_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?) LIMIT 1',user.id,gift.sender_id,gift.sender_id,user.id).first();need(!blocked,409,'gift_unavailable','This gift cannot be collected while either account is blocked.');}
   need(gift.state!==(opening?'declined':'opened'),409,'gift_already_handled',opening?'This gift was declined.':'This gift was already collected.');
   const blockGuard=opening?" AND NOT EXISTS(SELECT 1 FROM social_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)) AND(SELECT COUNT(*) FROM live_accounts WHERE id IN (?,?) AND account_status='active')=2":'';
   const writes=[q(db,"UPDATE cosmetic_gifts SET state=?,opened_at=COALESCE(opened_at,?) WHERE id=? AND recipient_id=? AND state='pending'"+blockGuard+' AND '+actor.sql,opening?'opened':'declined',now,gift.id,user.id,...(opening?[user.id,gift.sender_id,gift.sender_id,user.id,user.id,gift.sender_id]:[]),...actor.binds)];
   if(opening)writes.push(q(db,"INSERT OR IGNORE INTO cosmetic_ownership(account_id,cosmetic_id,claimed_at) SELECT recipient_id,catalog_id,? FROM cosmetic_gifts WHERE id=? AND recipient_id=? AND state='opened' AND NOT EXISTS(SELECT 1 FROM social_blocks WHERE (blocker_id=? AND blocked_id=?) OR (blocker_id=? AND blocked_id=?)) AND "+actor.sql,now,gift.id,user.id,user.id,gift.sender_id,gift.sender_id,user.id,...actor.binds));
   if(opening)writes.push(q(db,"INSERT OR IGNORE INTO gift_instances(id,catalog_id,owner_id,origin_gift_id,origin_kind,created_at) SELECT 'gift:'||id,catalog_id,recipient_id,id,'gift',? FROM cosmetic_gifts WHERE id=? AND recipient_id=? AND state='opened' AND NOT EXISTS(SELECT 1 FROM social_blocks WHERE (blocker_id=? AND blocked_id=?) OR(blocker_id=? AND blocked_id=?)) AND "+actor.sql,now,gift.id,user.id,user.id,gift.sender_id,gift.sender_id,user.id,...actor.binds));
   await db.batch(writes);
   await requireCurrentActor(db,user);const final=await q(db,'SELECT state FROM cosmetic_gifts WHERE id=? AND recipient_id=?',gift.id,user.id).first();
   need(final?.state===(opening?'opened':'declined'),409,'gift_already_handled','This gift was already handled in another session. Refresh the gift requests.');
   return json({handled:true,...await inventory(db,user)});
  }
  if(path.length===1&&path[0]==='badges'&&method==='GET'){
   const rows=(await q(db,'SELECT * FROM badge_definitions ORDER BY created_at,id').all()).results,definitions=[...BADGE_DEFINITIONS.map(d=>({...d,...rows.find(r=>r.id===d.id)})),...rows.filter(r=>!BADGE_DEFINITIONS.some(d=>d.id===r.id))];
   const awards=(await q(db,`SELECT a.id,a.badge_id,a.issued_at,a.revoked_at,a.reason,a.issuer_id,i.display_name AS issuer_name,d.name,d.requirement,d.description,d.active FROM badge_awards a JOIN badge_definitions d ON d.id=a.badge_id LEFT JOIN live_accounts i ON i.id=a.issuer_id WHERE a.account_id=? ORDER BY a.issued_at DESC`,user.id).all()).results;
   return json({definitions,awards:awards.map(a=>({...a,valid:!a.revoked_at&&!!a.active,issuer:a.issuer_id?'Reviewed by '+(a.issuer_name||'platform owner'):'VOIDLINE server rule'})),decorationsAreAchievements:false});
  }
  if(path.length===2&&path[0]==='instances'&&method==='GET'){
   let id;try{id=decodeURIComponent(path[1]);}catch{throw new AuthError(400,'invalid_instance','Choose a valid owned instance.');}
   need(id.length>0&&id.length<=200&&!/[\u0000-\u001f\u007f]/.test(id),400,'invalid_instance','Choose a valid owned instance.');
   const row=await q(db,ownInstanceSelect+' WHERE i.id=? AND i.owner_id=?',id,user.id).first();need(row,404,'instance_unavailable','This owned instance is unavailable.');
   const designs=new Map((await effectiveCatalog(db)).map(item=>[item.id,item]));await requireCurrentActor(db,user);need(await q(db,'SELECT 1 FROM gift_instances WHERE id=? AND owner_id=? AND ownership_revision=?',id,user.id,row.ownership_revision).first(),404,'instance_unavailable','This owned instance is unavailable.');return json({instance:privateInstance(row,designs)});
  }
  if(path.length===1&&path[0]==='instances'&&method==='GET'){
   await materializeLegacy(db,user,now);const offset=Number(url.searchParams.get('offset')||0);need(Number.isSafeInteger(offset)&&offset>=0,400,'invalid_page','Choose a valid page.');
   if(url.searchParams.get('catalogId'))itemFor(url.searchParams.get('catalogId'),'gift');
   const {where,args,order,orderArgs}=ownerFilters(url.searchParams,user.id);
   const total=(await q(db,'SELECT COUNT(*) AS n FROM gift_instances i WHERE '+where,...args).first()).n;
   const rows=(await q(db,ownInstanceSelect+' WHERE '+where+' ORDER BY '+order+' LIMIT 30 OFFSET ?',...args,...orderArgs,offset).all()).results;
   const designs=new Map((await effectiveCatalog(db)).map(item=>[item.id,item]));await requireCurrentActor(db,user);
   return json({instances:rows.map(i=>privateInstance(i,designs)),total,page:{offset,limit:30,hasMore:offset+rows.length<total}});
  }
  if(path.length===3&&path[0]==='instances'&&path[2]==='seen'&&method==='POST'){
   need(Number.isSafeInteger(body.expectedOwnershipRevision)&&body.expectedOwnershipRevision>=0,400,'invalid_revision','Review the current copy before marking it seen.');
   const seen=await q(db,'UPDATE gift_instances SET arrival_acknowledged_at=COALESCE(arrival_acknowledged_at,?) WHERE id=? AND owner_id=? AND ownership_revision=? AND '+actor.sql,now,decodeURIComponent(path[1]),user.id,body.expectedOwnershipRevision,...actor.binds).run();
   need(seen.meta?.changes,409,'instance_changed','This copy changed. Refresh your inventory.');return json({acknowledged:true});
  }
  if(path.length===2&&['collections','full-collections'].includes(path[0])&&method==='GET'){
   const id=decodeURIComponent(path[1]),offset=Number(url.searchParams.get('offset')||0);
   need(Number.isSafeInteger(offset)&&offset>=0,400,'invalid_page','Choose a valid page.');
   async function access(){
    const relation=await relationship(db,user.id,id),prefs=await q(db,"SELECT p.collection_visibility,p.full_inventory_visibility FROM live_accounts a LEFT JOIN profile_preferences p ON p.account_id=a.id WHERE a.id=? AND a.account_status='active'",id).first();
    if(!prefs)return 'none';
    if(mayView(prefs.full_inventory_visibility||'private',relation))return 'full';
    return path[0]==='collections'&&mayView(prefs.collection_visibility||'shared',relation)?'legacy':'none';
   }
   const scope=await access();need(scope!=='none',403,'collection_private','This collection is unavailable.');
   const where=scope==='legacy'?'owner_id=? AND catalog_id IN (SELECT value FROM json_each(?))':'owner_id=?',args=scope==='legacy'?[id,legacyGiftIds]:[id];
   const total=(await q(db,'SELECT COUNT(*) AS n FROM gift_instances WHERE '+where,...args).first()).n;
   const instances=(await q(db,'SELECT id,catalog_id FROM gift_instances WHERE '+where+' ORDER BY catalog_id,id LIMIT 30 OFFSET ?',...args,offset).all()).results;
   const designs=new Map((await effectiveCatalog(db)).map(item=>[item.id,item]));
   need(await access()===scope,403,'collection_private','This collection changed while loading.');await requireCurrentActor(db,user);
   return json({scope,fullInventoryVisible:scope==='full',instances:instances.map(i=>({...(id===user.id?{id:i.id}:{}),catalog_id:i.catalog_id,name:designs.get(i.catalog_id)?.name||'Unavailable collectible',model:collectibleDisplay(i.catalog_id,designs.get(i.catalog_id))})),total,page:{offset,limit:30,hasMore:offset+instances.length<total}});
  }
  if(path.length===1&&path[0]==='showcase'&&method==='POST'){
   await materializeLegacy(db,user,now);const slots=body.slots;
   need(Array.isArray(slots)&&slots.length<=3&&slots.every(s=>s&&typeof s.instanceId==='string'&&typeof s.showSender==='boolean'&&(s.slot===undefined||Number.isSafeInteger(s.slot)&&s.slot>=1&&s.slot<=3))&&slots.every(s=>s.featured===undefined||typeof s.featured==='boolean')&&slots.filter(s=>s.featured).length<=1&&new Set(slots.map(s=>s.instanceId)).size===slots.length&&new Set(slots.map((s,index)=>s.slot??index+1)).size===slots.length,400,'invalid_showcase','Choose up to three different owned gifts.');
   const ids=slots.map(s=>s.instanceId),condition=ids.length?`(SELECT COUNT(*) FROM gift_instances WHERE owner_id=? AND id IN (${ids.map(()=>'?').join(',')}))=?`:'1=1',binds=ids.length?[user.id,...ids,ids.length]:[];
   need(!ids.length||(await q(db,`SELECT COUNT(*) AS n FROM gift_instances WHERE owner_id=? AND id IN (${ids.map(()=>'?').join(',')})`,user.id,...ids).first()).n===ids.length,403,'instance_not_owned','Only gifts currently owned by you can appear in the showcase.');
   await db.batch([q(db,'DELETE FROM gift_showcase WHERE account_id=? AND '+condition+' AND '+actor.sql,user.id,...binds,...actor.binds),...slots.map((slot,index)=>q(db,'INSERT INTO gift_showcase(account_id,slot,instance_id,show_sender,featured) SELECT ?,?,?,?,? WHERE '+condition+' AND '+actor.sql,user.id,slot.slot??index+1,slot.instanceId,slot.showSender?1:0,slot.featured?1:0,...binds,...actor.binds))]);
   await requireCurrentActor(db,user);const committed=await inventory(db,user);need(committed.showcase.length===slots.length&&slots.every((s,index)=>committed.showcase.some(row=>row.slot===(s.slot??index+1)&&row.instance_id===s.instanceId&&!!row.show_sender===s.showSender&&!!row.featured===!!s.featured)),409,'showcase_changed','Gift ownership changed before the showcase could save. Refresh and try again.');return json({saved:true,...committed});
  }
  if(path[0]==='transfers'&&path.length<=2&&method==='GET'){
   const select=`SELECT t.*,i.catalog_id,i.owner_id=? AS mine,s.username AS sender_username,s.display_name AS sender_name,r.username AS recipient_username,r.display_name AS recipient_name FROM gift_transfers t JOIN gift_instances i ON i.id=t.instance_id JOIN live_accounts s ON s.id=t.sender_id JOIN live_accounts r ON r.id=t.recipient_id`;
   if(path.length===2){
    const row=await q(db,select+' WHERE t.id=? AND (t.sender_id=? OR t.recipient_id=?)',user.id,path[1],user.id,user.id).first();
    const transfer=await transferReceipt(db,row,user.id,catalog);await requireCurrentActor(db,user);return json({transfer});
   }
   const column=url.searchParams.get('box')==='sent'?'sender_id':'recipient_id',offset=Number(url.searchParams.get('offset')||0);
   need(Number.isSafeInteger(offset)&&offset>=0,400,'invalid_page','Choose a valid page.');
   const total=(await q(db,`SELECT COUNT(*) AS n FROM gift_transfers WHERE ${column}=?`,user.id).first()).n;
   const rows=(await q(db,select+` WHERE t.${column}=? ORDER BY t.created_at DESC,t.id DESC LIMIT 30 OFFSET ?`,user.id,user.id,offset).all()).results;
   const transfers=await Promise.all(rows.map(row=>transferReceipt(db,row,user.id,catalog)));
   await requireCurrentActor(db,user);return json({transfers,total,page:{offset,limit:30,hasMore:offset+transfers.length<total}});
  }
  if(path.length===1&&path[0]==='transfers'&&method==='POST'){
   need(!body.message,503,'private_note_unavailable','Private gift notes require encrypted messaging and cannot be sent here.');
   need(typeof body.instanceId==='string'&&body.instanceId.length<=220&&typeof body.clientId==='string'&&/^[A-Za-z0-9_-]{8,100}$/.test(body.clientId),400,'invalid_transfer','Choose a gift and stable transfer request ID.');
   const username=normalizeUsername(body.username),revision=body.expectedOwnershipRevision??0;
   need(Number.isSafeInteger(revision)&&revision>=0,400,'invalid_revision','Review the ownership period on this copy.');
   const existing=()=>q(db,'SELECT t.*,a.username AS recipient_username FROM gift_transfers t JOIN live_accounts a ON a.id=t.recipient_id WHERE t.sender_id=? AND t.client_id=?',user.id,body.clientId).first();
   async function confirmed(row,status=200){
    need(row.instance_id===body.instanceId&&row.ownership_revision===revision&&(body.recipientId?body.recipientId===row.recipient_id:row.recipient_username===username),409,'retry_conflict','This transfer request ID belongs to a different reviewed transfer.');
    const transfer=await transferReceipt(db,row,user.id,catalog);await requireCurrentActor(db,user);return json({transfer,acknowledged:true},status);
   }
   const previous=await existing();if(previous)return await confirmed(previous);
   await materializeLegacy(db,user,now);
   const recipient=await requireRecipient(db,user.id,username);
   need(!body.recipientId||body.recipientId===recipient.id,409,'recipient_changed','The recipient identity changed. Review this transfer again before sending.');
   const instance=await q(db,"SELECT i.*,EXISTS(SELECT 1 FROM gift_transfers h WHERE h.instance_id=i.id AND h.state='accepted') AS previously_transferred FROM gift_instances i WHERE id=? AND owner_id=?",body.instanceId,user.id).first();
   // Older clients may offer a virgin legacy copy; a returned copy or a new capsule model needs an explicit reviewed period.
   if(instance&&body.expectedOwnershipRevision===undefined)need(!instance.previously_transferred&&catalog.get(instance.catalog_id)?.acquisitionPolicy==='legacy-free',409,'ownership_changed','Reload this collectible to review its current ownership.');
   if(!instance||instance.ownership_revision!==revision||instance.pending_transfer_id){
    const retry=await existing();if(retry)return await confirmed(retry);
    need(instance,404,'instance_unavailable','This owned gift is unavailable.');
    need(instance.ownership_revision===revision,409,'ownership_changed','This copy changed hands. Refresh and review it again.');
    throw new AuthError(409,'transfer_pending','This instance already has a pending transfer.');
   }
   const id=crypto.randomUUID(),snapshot=JSON.stringify(collectibleDisplay(instance.catalog_id,(await effectiveCatalog(db)).find(i=>i.id===instance.catalog_id)));
   await db.batch([
    q(db,`UPDATE gift_instances SET pending_transfer_id=? WHERE id=? AND owner_id=? AND ownership_revision=? AND pending_transfer_id IS NULL
     AND NOT EXISTS(SELECT 1 FROM social_blocks WHERE(blocker_id=? AND blocked_id=?)OR(blocker_id=? AND blocked_id=?))
     AND NOT EXISTS(SELECT 1 FROM cosmetic_profiles WHERE account_id=? AND gifts_enabled=0)
     AND(SELECT COUNT(*) FROM live_accounts WHERE id IN (?,?) AND account_status='active')=2
     AND (SELECT COUNT(*) FROM gift_transfers WHERE sender_id=? AND created_at>?)<10
     AND (SELECT COUNT(*) FROM gift_transfers WHERE sender_id=? AND recipient_id=? AND created_at>?)<3 AND ${actor.sql}`,id,instance.id,user.id,revision,user.id,recipient.id,recipient.id,user.id,recipient.id,user.id,recipient.id,user.id,now-3600000,user.id,recipient.id,now-86400000,...actor.binds),
    q(db,"INSERT OR IGNORE INTO gift_transfers(id,instance_id,sender_id,recipient_id,client_id,state,created_at,ownership_revision,model_snapshot) SELECT ?,?,?,?,?,'pending',?,?,? WHERE EXISTS(SELECT 1 FROM gift_instances WHERE id=? AND owner_id=? AND ownership_revision=? AND pending_transfer_id=?)",id,instance.id,user.id,recipient.id,body.clientId,now,revision,snapshot,instance.id,user.id,revision,id),
    q(db,'UPDATE gift_instances SET pending_transfer_id=NULL WHERE id=? AND pending_transfer_id=? AND NOT EXISTS(SELECT 1 FROM gift_transfers WHERE id=?)',instance.id,id,id)
   ]);
   const transfer=await existing();need(transfer,409,'transfer_unavailable','The copy or recipient changed, or the transfer limit was reached. Refresh before retrying.');
   return await confirmed(transfer,transfer.id===id?201:200);
  }
  if(path.length===3&&path[0]==='transfers'&&['open','decline','cancel'].includes(path[2])&&method==='POST'){
   const transfer=await q(db,'SELECT * FROM gift_transfers WHERE id=?',path[1]).first(),opening=path[2]==='open',cancel=path[2]==='cancel',next=opening?'accepted':cancel?'cancelled':'declined';
   need(transfer&&(cancel?transfer.sender_id:transfer.recipient_id)===user.id,404,'transfer_unavailable','This transfer is unavailable.');
   need(transfer.state==='pending'||transfer.state===next,409,'transfer_already_handled','This transfer was already handled.');
   if(transfer.state==='pending'){
    const guard=opening?` AND EXISTS(SELECT 1 FROM gift_instances WHERE id=? AND owner_id=? AND pending_transfer_id=? AND ownership_revision=?) AND NOT EXISTS(SELECT 1 FROM social_blocks WHERE(blocker_id=? AND blocked_id=?)OR(blocker_id=? AND blocked_id=?)) AND NOT EXISTS(SELECT 1 FROM cosmetic_profiles WHERE account_id=? AND gifts_enabled=0) AND(SELECT COUNT(*) FROM live_accounts WHERE id IN (?,?) AND account_status='active')=2`:'';
    await db.batch([
     q(db,"UPDATE gift_transfers SET state=?,handled_at=? WHERE id=? AND state='pending'"+guard+' AND '+actor.sql,next,now,transfer.id,...(opening?[transfer.instance_id,transfer.sender_id,transfer.id,transfer.ownership_revision,transfer.sender_id,transfer.recipient_id,transfer.recipient_id,transfer.sender_id,transfer.recipient_id,transfer.sender_id,transfer.recipient_id]:[]),...actor.binds),
     opening?q(db,"UPDATE gift_instances SET owner_id=?,pending_transfer_id=NULL WHERE id=? AND owner_id=? AND pending_transfer_id=? AND ownership_revision=? AND EXISTS(SELECT 1 FROM gift_transfers WHERE id=? AND state='accepted')",transfer.recipient_id,transfer.instance_id,transfer.sender_id,transfer.id,transfer.ownership_revision,transfer.id):q(db,"UPDATE gift_instances SET pending_transfer_id=NULL WHERE id=? AND pending_transfer_id=? AND EXISTS(SELECT 1 FROM gift_transfers WHERE id=? AND state=?) AND "+actor.sql,transfer.instance_id,transfer.id,transfer.id,next,...actor.binds)
    ]);
   }
   await requireCurrentActor(db,user);const final=await q(db,'SELECT * FROM gift_transfers WHERE id=?',transfer.id).first();need(final?.state===next,409,'transfer_unavailable','The transfer could not be completed. Its owner and your inventory are unchanged.');
   return json({handled:true,state:next,transfer:await transferReceipt(db,final,user.id,catalog),...await inventory(db,user)});
  }
  throw new AuthError(404,'not_found','This collection action is unavailable.');
 }catch(error){return json({error:{code:error instanceof AuthError?error.code:'collection_unavailable',message:error instanceof AuthError?error.message:'The collection could not be updated. Please retry.'}},error instanceof AuthError?error.status:503);}
}
export default {fetch:handleCosmeticsRequest};
