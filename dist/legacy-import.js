/* Read-only review of pre-account device archives. No network, seed, storage
   mutation, membership, or account ownership grant is performed here. */
(() => {
  'use strict';
  const LEGACY = 'voidline.local.v1', BASE = 'voidline.archive.v3.base', OPS = 'voidline.archive.v3.op.';
  const TAB = 'voidline.tab.v1', MEDIA = TAB + '.media.';
  // Exact provenance fingerprints from the two shipped fixture catalogues.
  // These are classification signatures, never authentication credentials.
  const FIXTURES = [
  [
    "afterhours/general",
    "seed-afterhours-general-0",
    "nova",
    "77cabd6fa22fccd1504e4bd268a878c67bd88e623c3e6dcc49c01525882b9176"
  ],
  [
    "afterhours/general",
    "seed-afterhours-general-1",
    "ghost",
    "bd7381ef39264728b14aa3c13820e9d695d5f8a9af2ad8716065c09f9b24b466"
  ],
  [
    "afterhours/general",
    "seed-afterhours-general-2",
    "pixel",
    "583db09f604790c81d5ec8c7a47046f1c404a2f9eaef4631c13fc354000871d3"
  ],
  [
    "afterhours/general",
    "seed-afterhours-general-3",
    "orbit",
    "135a9e516f4aeaab4958458b545cd7e941c84f6bb33429fd8c63279aaa2d7671"
  ],
  [
    "afterhours/general",
    "seed-afterhours-general-4",
    "nova",
    "9a3fc521420c63fa5043290a99b87d504fa76ead7acc1eb3bbe758dee74b6660"
  ],
  [
    "afterhours/general",
    "seed-afterhours-general-5",
    "moss",
    "976f0dc1c45cb52a79e2c299832a4af98e4918fd85451b873dbb3833db1ed90a"
  ],
  [
    "afterhours/introductions",
    "seed-afterhours-introductions-0",
    "nova",
    "c7121be1568848916e30336cf03951ea1db173371c9b814a944c582c2b4ef9df"
  ],
  [
    "afterhours/introductions",
    "seed-afterhours-introductions-1",
    "ghost",
    "c72456da1cdde8f3bc8b0661dd002982d204fd9a7d5a2517dc68230ad64ee9c6"
  ],
  [
    "afterhours/introductions",
    "seed-afterhours-introductions-2",
    "pixel",
    "6a8fe1332c39f59488e4beaf3ae633ee5748dbd0fb17645377521088d64c761b"
  ],
  [
    "afterhours/the-feed",
    "seed-afterhours-the-feed-0",
    "moss",
    "24b3b36385369d5cf87f797b6c5ceb363523abfece1151d49ddc0b36dcbffcbd"
  ],
  [
    "afterhours/the-feed",
    "seed-afterhours-the-feed-1",
    "orbit",
    "36cc01e18b4ac1befc8bebe1de9afcd63fef48f058a4312b61a87d7b58deb1e4"
  ],
  [
    "afterhours/larp-lounge",
    "seed-afterhours-larp-lounge-0",
    "pixel",
    "0b4744a2dfa8f4069cdcc6cb727ffaacc849a76819725e7f1942f8f8a40b2170"
  ],
  [
    "afterhours/larp-lounge",
    "seed-afterhours-larp-lounge-1",
    "nova",
    "939c4cbebc4510b6dbc4f7549e854ed3a0a384703e44c14fdef338c675b85364"
  ],
  [
    "afterhours/announcements",
    "seed-afterhours-announcements-0",
    "nova",
    "e7138dc1ea81fa70ffca695f621751dc2a6aff2daaee26c85a221dd3f836b438"
  ],
  [
    "arcade/general",
    "seed-arcade-general-0",
    "orbit",
    "fde1bc1a1f5add7d588a77f3bf247a0b6b73c2a57d6bd3187b04ac89c11eef45"
  ],
  [
    "arcade/general",
    "seed-arcade-general-1",
    "moss",
    "6afc1bd96bb813faf5e2f7fa632f54cc450660027a9859cd6019cdabf8761a91"
  ],
  [
    "studio/general",
    "seed-studio-general-0",
    "pixel",
    "c55ba53fef4405bd22da04d3476f1bad169721e96e7561567e125d30dc3ee725"
  ],
  [
    "studio/general",
    "seed-studio-general-1",
    "ghost",
    "b72ec7097d2ce5518811f31656934972ee5b248b806306138b6f69b1ce363982"
  ],
  [
    "afterhours/general",
    "seed-afterhours-general-0",
    "nova",
    "7d94756c14ae4e304d8066c1d02996a574f2c5a85ea08d65ae399fdb59118f7a"
  ],
  [
    "afterhours/general",
    "seed-afterhours-general-1",
    "ghost",
    "e917f5fbcd95d6428745b38bbb60902c6a578d9e1ec1f70f075781ce3093dfd6"
  ],
  [
    "afterhours/general",
    "seed-afterhours-general-2",
    "pixel",
    "53a0e7923d1e332b2904cd6e36fc461eefb7dd36de0369fbb3f7be13a2009fc9"
  ],
  [
    "afterhours/general",
    "seed-afterhours-general-3",
    "moss",
    "2e845ed42b20758fd703a5f7fc4b5fc301adce0eab0f2f0b1d5bddd32acbbbe9"
  ],
  [
    "afterhours/general",
    "seed-afterhours-general-4",
    "orbit",
    "420b33a7bfdcc0a511ab836aae7c11b36635456e57dc61f6b9c09cf74f92be88"
  ],
  [
    "afterhours/general",
    "seed-afterhours-general-5",
    "nova",
    "bf9ff08ab7d33c90900a29c190c8678f98d99016f3e0f09337d2025b6642ebe9"
  ],
  [
    "afterhours/introductions",
    "seed-afterhours-introductions-0",
    "nova",
    "58bbc67b217030d7243971e128df169f0a23d481422bdb2ff9899c2276b7fc0d"
  ],
  [
    "afterhours/introductions",
    "seed-afterhours-introductions-1",
    "ghost",
    "2c59b64c087214904d33359dc25b5bea34048974f6a88415f0858bebd04445ee"
  ],
  [
    "afterhours/introductions",
    "seed-afterhours-introductions-2",
    "moss",
    "13685436fcc0d4756bbf88da89eed3d018417f3af63933ae72b2b3d72125374f"
  ],
  [
    "afterhours/the-feed",
    "seed-afterhours-the-feed-0",
    "ghost",
    "9f5ee2fa4d77449e296d19bdba121272e0849e2a590d2d32e13fb2a2196320d0"
  ],
  [
    "afterhours/the-feed",
    "seed-afterhours-the-feed-1",
    "orbit",
    "356df29a898087a92e6e601274ac78179b104ec9f49661536efa4ee38d7c1395"
  ],
  [
    "studio/general",
    "seed-studio-general-0",
    "nova",
    "978d093d68295bc3bfe4ae34eb5efda8134d794b5e0504c6c25dd65a7c2c2c37"
  ],
  [
    "studio/general",
    "seed-studio-general-1",
    "pixel",
    "ca6e265875d42b831002bbf070c437a112042b9bc784a312e0a0214ed12e1685"
  ],
  [
    "studio/general",
    "seed-studio-general-2",
    "moss",
    "a37c1df72a5b2f24a44f15ef9c4337f4812925837248025533896cd975392034"
  ],
  [
    "studio/work-in-progress",
    "seed-studio-work-in-progress-0",
    "nova",
    "d29de921c1191d8b9e3b886fa65c12b6e8ba593cd57859d54c7a7b1287784cef"
  ],
  [
    "studio/work-in-progress",
    "seed-studio-work-in-progress-1",
    "orbit",
    "277932bdbcbc836f49777ca8ef43cd09377d451a60f580079d5a46eae195a76c"
  ],
  [
    "afterhours/night-bus",
    "seed-afterhours-night-bus-0",
    "nova",
    "7d94756c14ae4e304d8066c1d02996a574f2c5a85ea08d65ae399fdb59118f7a"
  ],
  [
    "afterhours/night-bus",
    "seed-afterhours-night-bus-1",
    "ghost",
    "e917f5fbcd95d6428745b38bbb60902c6a578d9e1ec1f70f075781ce3093dfd6"
  ],
  [
    "afterhours/night-bus",
    "seed-afterhours-night-bus-2",
    "pixel",
    "53a0e7923d1e332b2904cd6e36fc461eefb7dd36de0369fbb3f7be13a2009fc9"
  ],
  [
    "afterhours/night-bus",
    "seed-afterhours-night-bus-3",
    "moss",
    "2e845ed42b20758fd703a5f7fc4b5fc301adce0eab0f2f0b1d5bddd32acbbbe9"
  ],
  [
    "afterhours/night-bus",
    "seed-afterhours-night-bus-4",
    "orbit",
    "420b33a7bfdcc0a511ab836aae7c11b36635456e57dc61f6b9c09cf74f92be88"
  ],
  [
    "afterhours/night-bus",
    "seed-afterhours-night-bus-5",
    "nova",
    "bf9ff08ab7d33c90900a29c190c8678f98d99016f3e0f09337d2025b6642ebe9"
  ]
];
  const known = new Map(FIXTURES.map(([context,id,author,hash]) => [context + '\n' + id + '\n' + author + '\n' + hash,true]));
  const own = (value,key) => Object.prototype.hasOwnProperty.call(value,key);
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  const clone = value => JSON.parse(JSON.stringify(value));
  const label = (value,limit=280) => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').slice(0,limit);
  const limitations = Object.freeze([
    'This review is device-local. Nothing is uploaded or linked to an account.',
    'Only exact, unchanged shipped sample messages are excluded from the reviewed copy. Ambiguous and modified records are retained for your decision.',
    'Legacy conversations with sample residents are not real contacts, friendships, or community memberships.',
    'Local artifacts and profile settings are retained as legacy records. They do not grant account badges, roles, or verified ownership.',
    'The recovery download is unencrypted and may contain private text, media, profile details, and current-tab drafts if you explicitly include them.',
    'Original browser storage is never changed by this review. Protected account import is unavailable until an encrypted import path exists.'
  ]);
  function selectedKeys(storage,predicate) {
    const result=[];
    for(let index=0;index<storage.length;index++){const key=storage.key(index);if(typeof key==='string'&&predicate(key))result.push(key);}
    return result.sort();
  }
  function records(storage,predicate) {
    if(!storage)return {};
    const entries=[];for(const key of selectedKeys(storage,predicate)){const value=storage.getItem(key);if(value!==null)entries.push([key,value]);}
    return Object.fromEntries(entries);
  }
  const archiveKey = key => key === LEGACY || key === BASE || key.startsWith(OPS);
  const draftKey = key => key === TAB || key.startsWith(MEDIA);
  async function fingerprint(message) {
    if(!globalThis.crypto?.subtle)return null;
    const digest=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([message.author,message.text,message.contributionId||''])));
    return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  }
  async function classify(context,message) {
    if(!object(message)||typeof message.id!=='string'||typeof message.text!=='string')return {kind:'uncertain',reason:'Malformed legacy record retained in the recovery copy.'};
    if(message.author==='self')return {kind:'personal',reason:'Authored by the local profile.'};
    if(message.edited || (Number.isFinite(message.updatedAt)&&Number.isFinite(message.time)&&message.updatedAt>message.time) || (Array.isArray(message.reactions)&&message.reactions.some(reaction=>reaction?.mine)))return {kind:'uncertain',reason:'Modified legacy content or your interaction with a sample; retained for review.'};
    const hash=await fingerprint(message);
    if(hash&&known.has(context+'\n'+message.id+'\n'+message.author+'\n'+hash))return {kind:'known-fixture',reason:'Exact unchanged message from a shipped sample catalogue.'};
    return {kind:'uncertain',reason:hash?'Provenance is not an exact shipped fixture match; retained.':'Content fingerprints are unavailable in this browser; retained.'};
  }
  async function extract(state,options={}) {
    if(!object(state))throw new Error('The legacy archive is not a record. Export its raw recovery copy instead.');
    const candidate=clone(state),preview=[],classification=[],excludedSources=new Map(),referenceSources=[];
    const summary={messages:0,personalMessages:0,knownFixtures:0,uncertainMessages:0,retainedMessages:0,customCommunities:Array.isArray(state.customServers)?state.customServers.length:0,legacyConversations:Array.isArray(state.conversations)?state.conversations.length:0,artifacts:object(state.artifacts)?Object.keys(state.artifacts).length:0,previewLimit:100};
    candidate.messages=object(state.messages)?clone(state.messages):{};
    for(const [context,list]of Object.entries(candidate.messages)){
      if(!Array.isArray(list))continue;
      const retained=[];
      for(const message of list){
        const entry=await classify(context,message);summary.messages++;
        if(entry.kind==='personal')summary.personalMessages++;
        else if(entry.kind==='known-fixture')summary.knownFixtures++;
        else summary.uncertainMessages++;
        const excluded=options.excludeKnownFixtures!==false&&entry.kind==='known-fixture';
        if(!excluded){retained.push(message);summary.retainedMessages++;}else excludedSources.set(context+'\n'+message.id,{context,message:clone(message),kind:'known-fixture',reason:'Sample source retained only to explain a retained reply or thread reference.'});
        classification.push({context,id:typeof message?.id==='string'?message.id:null,...entry,excluded});
        if(preview.length<summary.previewLimit)preview.push({context:label(context,220),id:label(message?.id,100),author:label(message?.author,80),text:label(message?.text),...entry,excluded,hasImage:!!message?.image,hasAudio:!!message?.audio,replyTo:label(message?.replyTo,100),threadRoot:label(message?.threadRoot,100)});
      }
      candidate.messages[context]=retained;
    }
    const referenced=new Set();for(const [context,list]of Object.entries(candidate.messages))if(Array.isArray(list))for(const message of list)for(const id of [message?.replyTo,message?.threadRoot])if(typeof id==='string')referenced.add(context+'\n'+id);
    for(const key of referenced)if(excludedSources.has(key))referenceSources.push(excludedSources.get(key));
    summary.fixtureReferenceSources=referenceSources.length;
    return {summary,preview,classification,candidate,referenceSources,excludesKnownFixtures:options.excludeKnownFixtures!==false,warnings:[...limitations]};
  }
  function snapshot(storage) {
    const rawRecords=records(storage,archiveKey);
    if(!Object.keys(rawRecords).length)return {present:false,rawRecords,state:null};
    // VoidStore.read does not write, normalize, seed, or grant artifacts.
    if(window.VoidStore?.create)return {present:true,rawRecords,state:window.VoidStore.create(storage,LEGACY).read()};
    if(Object.keys(rawRecords).some(key=>key.startsWith(OPS)))throw new Error('The journal reader is unavailable. Original records can still be exported.');
    return {present:true,rawRecords,state:JSON.parse(rawRecords[BASE]??rawRecords[LEGACY]??'{}')};
  }
  function draftSummary(storage) {
    if(!storage)return {available:false,drafts:0,threadDrafts:0,attachmentRecords:0};
    try {
      const raw=JSON.parse(storage.getItem(TAB)||'{}');
      return {available:true,drafts:object(raw.drafts)?Object.values(raw.drafts).filter(d=>d&&[d.text,d.image,d.audio,d.imageRef,d.audioRef].some(Boolean)).length:0,threadDrafts:object(raw.threads)?Object.values(raw.threads).filter(value=>typeof value==='string'&&value).length:0,attachmentRecords:selectedKeys(storage,key=>key.startsWith(MEDIA)).length};
    }catch(_){return {available:false,drafts:0,threadDrafts:0,attachmentRecords:0};}
  }
  async function inspect(storage,options={}) {
    let found;
    try{found=snapshot(storage);if(!found.present)return {ok:true,present:false,summary:{messages:0,personalMessages:0,knownFixtures:0,uncertainMessages:0,retainedMessages:0},preview:[],candidate:null,warnings:[...limitations],drafts:draftSummary(options.sessionStorage)};
      const review=await extract(found.state,{excludeKnownFixtures:true});return {ok:true,present:true,...review,drafts:draftSummary(options.sessionStorage)};
    }catch(_){
      return {ok:false,present:found?.present??true,summary:null,preview:[],candidate:null,warnings:['This archive could not be reconstructed. Export the original recovery records before making changes.',...limitations],drafts:draftSummary(options.sessionStorage)};
    }
  }
  async function exportArchive(storage,options={}) {
    // Only designated legacy keys are exported: never authentication/session
    // cookies, another application's storage, or account transport caches.
    const localRecords=records(storage,archiveKey),sessionRecords=options.includeSessionDrafts?records(options.sessionStorage,draftKey):{};
    let state=null,reconstructed=false;try{const found=snapshot(storage);state=found.state;reconstructed=!!found.present;}catch(_){}
    return {format:'voidline-legacy-recovery',version:1,exportedAt:new Date().toISOString(),encrypted:false,state,reconstructed,localRecords,sessionRecords,warnings:[...limitations]};
  }
  async function downloadArchive(storage,options={}) {
    const data=await exportArchive(storage,options),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    try{link.href=url;link.download='VOIDLINE-local-recovery.json';document.body.append(link);link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    return {exported:true,encrypted:false};
  }
  window.VoidLegacy=Object.freeze({inspect,extract,exportArchive,downloadArchive,limitations});
})();
