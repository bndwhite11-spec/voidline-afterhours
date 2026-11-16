(() => {
  'use strict';
  let app, bound = false, svgSerial = 0, checking = false, activeId = '', filter = 'all', rotation = 0, pitch = 0, collectionContext = null, acquisitionTimer, acquisitionRemoveTimer, acquisitionActive = '';
  const acquisitionQueue = [];
  const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = value => Math.max(0, Number(value) || 0);
  const catalog = [
    {id:'larp',name:'LARP PRO MAX',tier:'Common',code:'AH—001',material:'Brushed titanium / violet enamel',collection:'THE FIRST TRANSMISSION',lore:'An unnecessarily serious insignia for a beautifully unserious identity. Wear the bit like ceremonial armor.',condition:'Open your archive. This starter artifact is available to every local profile.',rule:()=>true,progress:()=> 'Available to every profile',shape:'larp'},
    {id:'founder',name:'THE ORIGINAL SIGNAL',tier:'Edition',code:'AH—000',material:'Palladium / engraved obsidian',collection:'EDITION PROVENANCE',lore:'Every frequency starts somewhere. An engraved record of your first arrival in the Afterhours archive.',condition:'Open this edition of VOIDLINE. Earned automatically on this device. This is an edition provenance mark, not a limited-supply claim.',rule:()=>true,progress:()=> 'First arrival in this edition',shape:'founder'},
    {id:'night',name:'3:33 AM',tier:'Uncommon',code:'AH—033',material:'Smoked steel / luminous numerals',collection:'THE HOURS BETWEEN',lore:'A small machine for holding the hour after the hour. It does not tell you to sleep. It remembers that you stayed.',condition:'Write at least one original message in each of two different channels.',rule:s=>number(s.ownMessages)>=2&&number(s.channelsUsed)>=2,progress:s=>`${Math.min(number(s.channelsUsed),2)} / 2 channels with your messages`,shape:'night'},
    {id:'angel',name:'404 ANGEL',tier:'Rare',code:'AH—404',material:'Fractured chrome / ceramic core',collection:'UNREGISTERED ENTITIES',lore:'Lost in the system. Perfectly at home here. Its fractured wings carry a signal the directory could never find.',condition:'Choose a name other than “you”, write a biography of at least 20 characters and a status of at least 3 characters, then change an appearance option or upload an avatar.',rule:s=>!!s.profileComplete,progress:s=>s.profileComplete?'Profile complete':'Finish your name, biography, and appearance',shape:'angel'},
    {id:'ghost',name:'GHOST FREQUENCY',tier:'Epic',code:'AH—107',material:'Optical glass / silver interference',collection:'UNREGISTERED ENTITIES',lore:'Some signals are felt before they are heard. A translucent recording of the conversations that found you.',condition:'Share an image, write three thread replies, and post in three different channels.',rule:s=>number(s.attachments)>=1&&number(s.replies)>=3&&number(s.channelsUsed)>=3,progress:s=>`${Math.min(number(s.attachments),1)}/1 image · ${Math.min(number(s.replies),3)}/3 replies · ${Math.min(number(s.channelsUsed),3)}/3 channels`,shape:'ghost'},
    {id:'velvet',name:'VELVET STATIC',tier:'Epic',code:'AH—090',material:'Black chrome / analog grooves',collection:'THE HOURS BETWEEN',lore:'The soft noise between two stations. Woven from a dozen transmissions and the replies that made them a conversation.',condition:'Write twelve original messages across four channels, including four thread replies.',rule:s=>number(s.ownMessages)>=12&&number(s.channelsUsed)>=4&&number(s.replies)>=4,progress:s=>`${Math.min(number(s.ownMessages),12)}/12 messages · ${Math.min(number(s.channelsUsed),4)}/4 channels · ${Math.min(number(s.replies),4)}/4 replies`,shape:'velvet'},
    {id:'dead',name:'DEAD INTERNET',tier:'Legendary',code:'AH—NET',material:'Fractured nickel / transmission wire',collection:'POST-ALGORITHM RELICS',lore:'The network broke. The people stayed. A damaged globe for a place you made by hand, one room at a time.',condition:'Build a local community with three custom text channels and curate three pinned messages.',rule:s=>number(s.customServers)>=1&&number(s.customChannels)>=3&&number(s.pins)>=3,progress:s=>`${Math.min(number(s.customServers),1)}/1 community · ${Math.min(number(s.customChannels),3)}/3 channels · ${Math.min(number(s.pins),3)}/3 pins`,shape:'dead'},
    {id:'voidwalker',name:'VOIDWALKER',tier:'Mythic',code:'AH—Ø01',material:'Obsidian / cold-luminous core',collection:'POST-ALGORITHM RELICS',lore:'The gate does not open for a visitor. It opens for someone who has built a place worth returning to.',condition:'Build a community with three custom channels. Write forty messages across six channels, ten thread replies, and share three images.',rule:s=>number(s.customServers)>=1&&number(s.customChannels)>=3&&number(s.ownMessages)>=40&&number(s.channelsUsed)>=6&&number(s.replies)>=10&&number(s.attachments)>=3,progress:s=>`${Math.min(number(s.ownMessages),40)}/40 messages · ${Math.min(number(s.channelsUsed),6)}/6 channels · ${Math.min(number(s.replies),10)}/10 replies · ${Math.min(number(s.attachments),3)}/3 images · ${Math.min(number(s.customChannels),3)}/3 custom channels`,shape:'voidwalker'},
    {id:'unknown',name:'UNKNOWN ENTITY',tier:'Artifact',code:'AH—???',material:'Classified alloy / concealed mark',collection:'THE COMPLETE ARCHIVE',lore:'There was always one more reflection in the glass. It only becomes clear when the rest of the archive has a story.',condition:'Earn every other artifact and inspect all eight of their records. This marks completion of this local collection.',rule:(s,owned,seen)=>catalog.filter(b=>b.id!=='unknown').every(b=>owned[b.id]&&seen.includes(b.id)),progress:(s,owned,seen)=>`${catalog.filter(b=>b.id!=='unknown'&&owned[b.id]).length}/8 earned · ${catalog.filter(b=>b.id!=='unknown'&&seen.includes(b.id)).length}/8 inspected`,shape:'unknown'}
  ];
  const byId = id => catalog.find(b => b.id === id);
  const stats = () => app?.getStats?.() || {};
  const owned = id => !!app?.state?.artifacts?.[id];
  const motionAllowed = () => app?.state?.settings?.motion !== false && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  function ensureState() {
    if (!app.state.artifacts || typeof app.state.artifacts !== 'object' || Array.isArray(app.state.artifacts)) app.state.artifacts = {};
    if (!Array.isArray(app.state.artifactInspected)) app.state.artifactInspected = [];
    app.state.artifactInspected = app.state.artifactInspected.filter(id => !!byId(id));
    app.state.artifactSchema = 1;
  }
  function art(id) {
    const badge = byId(id) || byId('larp'), p = `va-${++svgSerial}`;
    const fill = key => `url(#${p}-${key})`;
    const defs = `<defs><linearGradient id="${p}-chrome" x1="0" y1="0" x2=".9" y2="1"><stop stop-color="#647084"/><stop offset=".17" stop-color="#f0f3f8"/><stop offset=".29" stop-color="#9097a7"/><stop offset=".46" stop-color="#333c4d"/><stop offset=".6" stop-color="#cbd1df"/><stop offset=".75" stop-color="#606b7f"/><stop offset="1" stop-color="#151d2b"/></linearGradient><linearGradient id="${p}-edge" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f2f3ff"/><stop offset=".35" stop-color="#7b8aa5"/><stop offset=".6" stop-color="#242d40"/><stop offset="1" stop-color="#aeb6cc"/></linearGradient><linearGradient id="${p}-dark" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#424b60"/><stop offset=".27" stop-color="#101522"/><stop offset=".55" stop-color="#262c3b"/><stop offset="1" stop-color="#050810"/></linearGradient><linearGradient id="${p}-glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ced7f6" stop-opacity=".6"/><stop offset=".24" stop-color="#93abd0" stop-opacity=".13"/><stop offset=".55" stop-color="#d9d7fa" stop-opacity=".36"/><stop offset="1" stop-color="#596785" stop-opacity=".08"/></linearGradient><linearGradient id="${p}-violet" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#e2dbfa"/><stop offset=".27" stop-color="#8f93d3"/><stop offset=".54" stop-color="#524a80"/><stop offset=".8" stop-color="#a5bad2"/><stop offset="1" stop-color="#7a699d"/></linearGradient><radialGradient id="${p}-core"><stop stop-color="#ecebff"/><stop offset=".18" stop-color="#b9bbf1"/><stop offset=".48" stop-color="#666aab"/><stop offset="1" stop-color="#1a2138"/></radialGradient><pattern id="${p}-grain" width="4" height="4" patternUnits="userSpaceOnUse"><path d="M0 2h4" stroke="#fff" stroke-opacity=".04" stroke-width=".5"/></pattern></defs>`;
    let shape = '';
    if (badge.shape === 'larp') shape = `<path d="m80 13 43 24 15 51-31 43-27 15-27-15-31-43 15-51Z" fill="${fill('dark')}" stroke="${fill('edge')}" stroke-width="2"/><path d="m80 19 37 22 14 45-29 39-22 13-22-13-29-39 14-45Z" fill="none" stroke="#6f718b" stroke-width=".65"/><path d="M39 58 25 47l9 31 17 20-11-31m9 32L29 83l13 28 21 12-14-20M121 58l14-11-9 31-17 20 11-31m-9 32 20-16-13 28-21 12 14-20" fill="${fill('chrome')}"/><path d="m80 31 14 26-14-8-14 8Z" fill="${fill('violet')}" stroke="#b9b2df" stroke-width=".6"/><path d="M59 63h14v35h29l-8 13H59Z" fill="${fill('chrome')}" stroke="#c7c6dc" stroke-width=".6"/><path d="m81 61 9 22 9-22h12L90 101 70 61Z" fill="${fill('violet')}" stroke="#d5c7ed" stroke-width=".5"/><path d="m80 119 5 7-5 7-5-7z" fill="${fill('chrome')}"/><path d="M61 42h9m20 0h9M47 127l-4 4m70-4 4 4" stroke="#ced0e5" stroke-width="1"/><text x="80" y="143" fill="#8f92a8" font-size="4" letter-spacing="1.5" text-anchor="middle">PRO MAX / 001</text>`;
    if (badge.shape === 'founder') shape = `<path d="M80 8 91 29l24-7-1 25 25 6-15 20 19 17-25 10 4 24-25-2-17 28-17-28-25 2 4-24-25-10 19-17-15-20 25-6-1-25 24 7Z" fill="${fill('chrome')}" stroke="#c6ccdc" stroke-width=".65"/><path d="m80 23 16 21 25 15-9 27-5 30-27 17-27-17-5-30-9-27 25-15Z" fill="${fill('dark')}" stroke="#525e75" stroke-width="1.3"/><path d="m80 30 13 21 21 12-8 22-5 27-21 14-21-14-5-27-8-22 21-12Z" fill="none" stroke="#949eb7" stroke-width=".65"/><circle cx="80" cy="79" r="31" fill="none" stroke="${fill('chrome')}" stroke-width="3"/><circle cx="80" cy="79" r="25" fill="#0b101d" stroke="#5d6680" stroke-width=".6"/><path d="m80 41 7 31 16 7-16 7-7 31-7-31-16-7 16-7Z" fill="${fill('chrome')}" stroke="#eff0f7" stroke-width=".4"/><path d="m80 57 3 18 8 4-8 4-3 18-3-18-8-4 8-4Z" fill="${fill('violet')}"/><path d="M31 84h8m82 0h8M64 19l3 9m26 0 3-9m-40 110 5-7m38 0 5 7" stroke="#f1f0fa" stroke-width="1"/><text x="80" y="119" fill="#9ca8c2" font-size="3.8" letter-spacing="1.1" text-anchor="middle">ORIGINAL / SIGNAL</text>`;
    if (badge.shape === 'night') shape = `<path d="m53 20 54 0 24 31v65l-28 25H57l-28-25V51Z" fill="${fill('chrome')}" stroke="#aeb7cb" stroke-width="1"/><path d="m57 25 46 0 22 28v60l-24 22H59l-24-22V53Z" fill="${fill('dark')}" stroke="#777d96" stroke-width=".6"/><path d="M58 15h44l-5 9H63Z" fill="${fill('chrome')}"/><path d="M57 139h46l-7 8H64Z" fill="${fill('chrome')}"/><path d="M45 63h70v39H45Z" fill="#090e1a" stroke="#8791ae" stroke-width=".8"/><path d="M48 66h64v33H48Z" fill="${fill('glass')}" opacity=".5"/><text x="80" y="90" fill="#c8c5ee" font-size="22" font-weight="500" font-family="monospace" text-anchor="middle" letter-spacing="-1">3:33</text><path d="M88 34a12 12 0 1 0 0 22 12 12 0 0 1 0-22Z" fill="${fill('chrome')}"/><path d="M53 110h54M59 116h42M68 122h24M40 76h2m76 0h2m-80 12h2m76 0h2" stroke="#a3a9c6" stroke-width=".8"/><circle cx="80" cy="128" r="1.6" fill="#a9a1d0"/><path d="M62 28v5m36-5v5M50 44l4 3m52 0 4-3" stroke="#e0dded" stroke-width=".8"/>`;
    if (badge.shape === 'angel') shape = `<path d="m78 62-21-22-36-9 8 28 30 21-15-4-20-7 14 24 23 8-18-2-12-4 18 19 24-4 7 21 7-21 24 4 18-19-12 4-18 2 23-8 14-24-20 7-15 4 30-21 8-28-36 9-21 22Z" fill="${fill('chrome')}" stroke="#d9dfe9" stroke-width=".6"/><path d="M26 37 58 53l17 21M32 55l28 16 13 14M31 76l29 13 12 4M41 96l22 7m71-66-32 16-17 21m43-19-28 16-13 14m42-9-29 13-12 4m31 3-22 7" fill="none" stroke="#20283c" stroke-width="1.8"/><path d="m80 33 12 16-5 30-7 11-7-11-5-30Z" fill="${fill('chrome')}" stroke="#f2effc" stroke-width=".7"/><ellipse cx="80" cy="29" rx="16" ry="4.5" fill="none" stroke="${fill('chrome')}" stroke-width="2.3"/><path d="m80 84 12 20-12 31-12-31Z" fill="${fill('dark')}" stroke="${fill('edge')}" stroke-width="1.2"/><path d="m80 92 4 14-4 14-4-14Z" fill="${fill('violet')}"/><path d="m46 37 6 9m54 0 6-9M71 129l-5 10m23-10 5 10" stroke="#999bb3" stroke-width=".8"/><text x="80" y="151" fill="#8f93ab" font-size="5" letter-spacing="3" text-anchor="middle">404 / ANGEL</text>`;
    if (badge.shape === 'ghost') shape = `<path d="M58 30c11-9 33-9 44 0 13 11 11 25 12 38l7 55-18-10-12 16-11-11-11 11-12-16-18 10 7-55c1-13-1-27 12-38Z" fill="${fill('glass')}" stroke="${fill('edge')}" stroke-width="1.5"/><path d="M61 37c8-8 30-8 38 0 7 7 9 19 9 32l5 42-12-7-10 13-11-11-11 11-10-13-12 7 5-42c0-13 2-25 9-32Z" fill="none" stroke="#adbad3" stroke-opacity=".35" stroke-width=".65"/><path d="M59 52c10-11 30-15 42-9M58 57l42-9M55 94l51-27" fill="none" stroke="#e5eafb" stroke-opacity=".25" stroke-width="2"/><path d="m64 66 8 4-8 5m32-9-8 4 8 5" fill="none" stroke="#dae2f7" stroke-width="2" stroke-linecap="round"/><path d="M75 84h10" stroke="#a6b4d2" stroke-width="1.5"/><g class="va-radio-lines" fill="none" stroke="${fill('chrome')}" stroke-width="1.2"><path d="M35 52a41 41 0 0 0 0 47M26 43a54 54 0 0 0 0 65m-9-74a68 68 0 0 0 0 83M125 52a41 41 0 0 1 0 47m9-56a54 54 0 0 1 0 65m9-74a68 68 0 0 1 0 83"/></g><path d="m80 8 3 8-3 8-3-8Z" fill="${fill('chrome')}"/><path d="M64 140h32m-26 4h20" stroke="#6d809e" stroke-width=".65"/><text x="80" y="153" fill="#7a8eab" font-size="4" letter-spacing="1.6" text-anchor="middle">SIGNAL / NO SOURCE</text>`;
    if (badge.shape === 'velvet') shape = `<path d="m69 13 35 14 24 35-6 32-17 18-10 32-29-9-30-27-6-36 19-32Z" fill="${fill('dark')}" stroke="${fill('edge')}" stroke-width="1.5"/><path d="M51 39c17-21 48-13 61 8 17 27-49 44-45 61 3 11 26 13 36 3l-7 25c-23 9-50-7-52-23-3-23 54-35 53-54-1-13-19-16-30-8l-1 10-24 8Z" fill="${fill('chrome')}" stroke="#b2b9cf" stroke-width=".5"/><path d="M61 39c26-8 41 7 36 20-7 18-37 27-46 45m4 5c-1 13 21 23 38 19M66 47c12-7 26-2 25 9-1 14-31 24-38 32" fill="none" stroke="#101827" stroke-width="1.2"/><path d="M36 78h79M33 83h86M36 88h79M40 93h66" stroke="#a2adc2" stroke-opacity=".3" stroke-width=".7"/><path d="M56 23 44 38m72 80-12 12M76 16l3 8m-11 109-3 8" stroke="#d0d7e5" stroke-width=".7"/><path d="m116 42 12 10-4 11-5-13-10-10Z" fill="${fill('violet')}"/><text x="80" y="153" fill="#7b88a0" font-size="4" letter-spacing="2" text-anchor="middle">VELVET / STATIC</text>`;
    if (badge.shape === 'dead') shape = `<path d="M80 12 92 25l25 7 6 25 16 22-16 22-6 25-25 7-12 15-12-15-25-7-6-25-16-22 16-22 6-25 25-7Z" fill="${fill('dark')}" stroke="${fill('edge')}" stroke-width="1.2"/><g fill="none" stroke="${fill('chrome')}"><circle cx="80" cy="80" r="49" stroke-width="3"/><ellipse cx="80" cy="80" rx="21" ry="49" stroke-width="1.3"/><path d="M34 65c30-13 62-13 92 0M32 83h96M38 101c27 10 57 10 84 0M80 31v98" stroke-width="1.2"/></g><path d="m83 26-14 33 19 14-14 23 13 21-14 21h14l14-23-16-19 17-27-20-15 14-28Z" fill="#0a0f1b" stroke="#a8b0c8" stroke-width=".7"/><path d="m103 31 12-8 5 12-10 7Z" fill="${fill('chrome')}"/><path d="m35 111 9 11-10 5-8-9Z" fill="${fill('chrome')}"/><path d="M20 73h12m-16 6h13m101 10h14m-13 6h9" stroke="#9da6c2" stroke-width=".8"/><path d="M64 139h33" stroke="#8b93aa" stroke-width=".7"/><text x="80" y="153" fill="#9a9db8" font-size="4" letter-spacing="1.3" text-anchor="middle">HUMANS / STILL HERE</text>`;
    if (badge.shape === 'voidwalker') shape = `<path d="m80 7 12 17 16 3-4 21 20 15-7 18 14 28-20 5-10 25-21-9-21 9-10-25-20-5 14-28-7-18 20-15-4-21 16-3Z" fill="${fill('chrome')}" stroke="#9cacc7" stroke-width=".7"/><path d="m80 18 9 17 12 1-4 18 19 13-7 14 12 23-18 3-8 23-15-8-15 8-8-23-18-3 12-23-7-14 19-13-4-18 12-1Z" fill="${fill('dark')}" stroke="#7f8ca6" stroke-width=".65"/><path d="M56 104V69c0-22 24-34 24-34s24 12 24 34v35l-24 15Z" fill="#050a13" stroke="${fill('edge')}" stroke-width="2"/><path d="M63 99V70c0-15 17-25 17-25s17 10 17 25v29l-17 12Z" fill="none" stroke="#434d6e" stroke-width="1"/><path d="m80 55 12 25-12 23-12-23Z" fill="${fill('core')}" stroke="#bdc3ed" stroke-width=".5"/><path d="m80 63 6 17-6 14-6-14Z" fill="#e0e2ff" opacity=".75"/><path d="M47 59c-14 3-15 15-6 20m4 16c-17 2-18 14-8 18m76-54c14 3 15 15 6 20m-4 16c17 2 18 14 8 18M60 119l-8 7m48-7 8 7M80 11v13" fill="none" stroke="${fill('chrome')}" stroke-width="1.8"/><path d="m80 131 4 8-4 9-4-9Z" fill="${fill('violet')}"/><text x="80" y="157" fill="#7f8ba9" font-size="3.8" letter-spacing="1.7" text-anchor="middle">THROUGH / THE OTHER SIDE</text>`;
    if (badge.shape === 'unknown') shape = `<path d="M43 20h74l23 23v74l-23 23H43l-23-23V43Z" fill="${fill('dark')}" stroke="${fill('edge')}" stroke-width="1.5"/><path d="M47 28h66l19 19v66l-19 19H47l-19-19V47Z" fill="none" stroke="#727b94" stroke-width=".6"/><path d="M34 59V39h22m48 0h22v20M34 101v20h22m48 0h22v-20" fill="none" stroke="${fill('chrome')}" stroke-width="4"/><path d="M52 51h56v58H52Z" fill="#090e19" stroke="#3e4b63" stroke-width=".7"/><g class="va-hidden-mark"><path d="m80 45 23 35-23 35-23-35Z" fill="${fill('chrome')}"/><path d="m80 58 14 22-14 22-14-22Z" fill="${fill('dark')}"/><circle cx="80" cy="80" r="8" fill="${fill('core')}"/><path d="M43 80h23m28 0h23M80 36v22m0 44v22" stroke="#b6c2dd" stroke-width=".8"/></g><g class="va-classified-bars"><path d="M43 66h74v9H43Zm0 17h74v9H43Z" fill="${fill('chrome')}"/><path d="M46 69h68m-68 17h68" stroke="#3b455b" stroke-width="1"/></g><path d="M55 14h50m-50 132h50" stroke="#9199b3" stroke-width=".8"/><text x="80" y="155" fill="#8391ae" font-size="4" letter-spacing="2" text-anchor="middle">IDENTITY / UNRESOLVED</text>`;
    return `<svg class="va-art va-art-${badge.shape}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" role="img" aria-label="${esc(badge.name)} collectible artwork">${defs}<g class="va-art-object">${shape}</g></svg>`;
  }
  function markBody(id) {
    const shapes = {
      larp:'<path fill="currentColor" fill-rule="evenodd" d="m16 1 11 6 3 12-8 10-6 3-6-3-8-10L5 7Zm0 3-8 5-3 10 7 8 4 2 4-2 7-8-3-10Z"/><path fill="currentColor" d="M10 10h4v10h7l-3 4h-8Zm6-1 3 7 3-7h4l-7 13-6-13Z"/>',
      founder:'<path fill="currentColor" d="m16 0 3 8 8-3-3 8 8 3-8 3 3 8-8-3-3 8-3-8-8 3 3-8-8-3 8-3-3-8 8 3Zm0 7-2 7-7 2 7 2 2 7 2-7 7-2-7-2Z"/><circle cx="16" cy="16" r="3" fill="currentColor"/>',
      night:'<path fill="currentColor" fill-rule="evenodd" d="M9 2h14l6 7v17l-6 5H9l-6-5V9Zm1 3L6 10v14l5 4h10l5-4V10l-4-5Z"/><path fill="currentColor" d="M9 11h5v11H9v-2h3v-3h-3v-2h3v-2H9Zm9 0h5v11h-5v-2h3v-3h-3v-2h3v-2h-3Z"/><path stroke="currentColor" stroke-width="1.8" d="M16 13v2m0 3v2M13 7h6"/>',
      angel:'<path fill="currentColor" d="m15 11-5-5L0 3l3 9 7 4-6-1 4 6 6 1 2 8 2-8 6-1 4-6-6 1 7-4 3-9-10 3-5 5-1-5Zm-5 2-6-4 6 2Zm12 0 6-4-6 2Z"/><ellipse cx="16" cy="3" rx="4" ry="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/>',
      ghost:'<path fill="currentColor" fill-rule="evenodd" d="M16 2c-6 0-9 4-9 10L5 28l6-3 5 5 5-5 6 3-2-16c0-6-3-10-9-10Zm0 3c4 0 6 3 6 7l1 11-3-1-4 4-4-4-3 1 1-11c0-4 2-7 6-7Z"/><path fill="currentColor" d="m12 11 3 2-3 2Zm8 0-3 2 3 2Z"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M3 9a13 13 0 0 0 0 12M29 9a13 13 0 0 1 0 12"/>',
      velvet:'<path fill="currentColor" d="M8 3c6-5 16-2 19 5 4 10-17 14-15 19 1 3 7 3 10 0l-2 5c-8 1-15-4-15-9 0-8 18-12 17-17-1-4-8-4-11 0v4L3 13l1-7Z"/><path fill="none" stroke="currentColor" stroke-width="1.5" d="M1 16h7m16 0h7M2 20h4m19 0h5"/>',
      dead:'<path fill="none" stroke="currentColor" stroke-width="2.5" d="M17 2A14 14 0 0 0 12 30M21 3a14 14 0 0 1-3 27M2 13h11m6 0h11M3 22h8m9 0h9M13 4C7 10 7 22 12 28M22 6c4 5 4 13 0 19"/><path fill="none" stroke="currentColor" stroke-width="1.6" d="m20 0-5 9 5 7-6 8 3 8"/>',
      voidwalker:'<path fill="currentColor" fill-rule="evenodd" d="m16 0 4 5 5-1-1 7 6 4-3 5 4 7-7 1-3 4-5-3-5 3-3-4-7-1 4-7-3-5 6-4-1-7 5 1Zm0 6C8 11 7 19 10 25l6 3 6-3c3-6 2-14-6-19Z"/><path fill="currentColor" d="m16 11 5 8-5 7-5-7Z"/>',
      unknown:'<path fill="none" stroke="currentColor" stroke-width="2.8" d="M11 3H5L2 6v6m19-9h6l3 3v6M2 20v6l3 3h6m10 0h6l3-3v-6"/><path fill="currentColor" fill-rule="evenodd" d="m16 5 8 11-8 11-8-11Zm0 5-4 6 4 6 4-6Z"/><circle cx="16" cy="16" r="1.6" fill="currentColor"/>'
    };
    return shapes[id] || shapes.larp;
  }
  function mark(id, size=24) {
    const b=byId(id)||byId('larp'), n=[16,24,32].includes(size)?size:24;
    return `<svg xmlns="http://www.w3.org/2000/svg" class="va-mark va-mark-${b.id}" viewBox="0 0 32 32" width="${n}" height="${n}" role="img" aria-label="${esc(b.name)} miniature mark">${markBody(b.id)}</svg>`;
  }
  function installMiniSprite() {
    if(document.getElementById?.('va-mini-sprite')||typeof document.createElementNS!=='function'||!document.body?.appendChild)return;
    const sprite=document.createElementNS('http://www.w3.org/2000/svg','svg');
    sprite.id='va-mini-sprite';sprite.setAttribute('aria-hidden','true');sprite.setAttribute('focusable','false');
    sprite.setAttribute('style','position:absolute;width:0;height:0;overflow:hidden;pointer-events:none');
    sprite.innerHTML=`<defs>${catalog.map(b=>`<symbol id="va-mini-${b.id}" viewBox="0 0 32 32">${markBody(b.id)}</symbol>`).join('')}</defs>`;
    document.body.appendChild(sprite);
  }
  function mini(id,size=24) {
    const b=byId(id);if(!b)return '';const n=[16,24,32].includes(size)?size:24;
    return `<button type="button" class="vbadge-mini va-tier-${b.tier.toLowerCase()}" style="--va-mini-size:${n}px" data-vbadge="${b.id}" aria-label="Inspect ${esc(b.name)}" title="${esc(b.name)}"><svg class="va-mark va-mark-${b.id}" viewBox="0 0 32 32" aria-hidden="true"><use href="#va-mini-${b.id}"></use></svg></button>`;
  }
  function cabinet(ids) {
    const list=(Array.isArray(ids)?ids:catalog.filter(b=>owned(b.id)).map(b=>b.id)).filter(id=>byId(id));
    return `<div class="va-mini-cabinet" aria-label="Artifact cabinet">${list.slice(0,6).map(id=>`<button type="button" class="va-cabinet-slot" data-vbadge="${esc(id)}" aria-label="Inspect ${esc(byId(id).name)}">${art(id)}<span>${esc(byId(id).name)}</span></button>`).join('')}${!list.length?'<span class="va-cabinet-empty">Your first artifact is waiting in the archive.</span>':''}</div>`;
  }
  const dialogOpen=()=>!!document.querySelector?.('dialog[open]');
  function scheduleAcquisition(delay=5200) {
    clearTimeout(acquisitionTimer);
    if(!dialogOpen())acquisitionTimer=setTimeout(dismissAcquisition,delay);
  }
  function dismissAcquisition() {
    clearTimeout(acquisitionTimer);clearTimeout(acquisitionRemoveTimer);
    const card=document.querySelector('.va-acquisition');
    const next=()=>{card?.remove();acquisitionActive='';showNextAcquisition();};
    if(!card)return next();
    card.classList.add('va-acquisition-leaving');
    acquisitionRemoveTimer=setTimeout(next,motionAllowed()?240:0);
  }
  function showNextAcquisition() {
    if(acquisitionActive||!acquisitionQueue.length||dialogOpen()||typeof document.createElement!=='function'||!document.body?.appendChild)return;
    const b=byId(acquisitionQueue.shift());if(!b)return showNextAcquisition();
    acquisitionActive=b.id;const card=document.createElement('aside');
    card.className=`va-acquisition va-tier-${b.tier.toLowerCase()}${motionAllowed()?'':' va-acquisition-still'}`;
    card.setAttribute('aria-label','New artifact acquired');
    card.innerHTML=`<div class="va-acquisition-light" aria-hidden="true"></div><div class="va-acquisition-art">${art(b.id)}</div><div class="va-acquisition-copy"><p class="va-acquisition-eyebrow" role="status">ARTIFACT ACQUIRED <i></i> ${b.tier.toUpperCase()}</p><strong>${b.name}</strong><span>${acquisitionQueue.length?`${acquisitionQueue.length} more ${acquisitionQueue.length===1?'artifact':'artifacts'} to reveal.`:'A new part of your Afterhours story.'}</span><button type="button" data-vbadge="${b.id}" data-vbadge-acquisition-inspect>Inspect your artifact <span>↗</span></button></div><button type="button" class="va-acquisition-dismiss" data-vbadge-acquisition-close aria-label="Dismiss artifact reveal">×</button>`;
    document.body.appendChild(card);
    card.addEventListener('pointerenter',()=>clearTimeout(acquisitionTimer));
    card.addEventListener('pointerleave',()=>{if(!card.contains(document.activeElement))scheduleAcquisition(3200);});
    card.addEventListener('focusin',()=>clearTimeout(acquisitionTimer));
    card.addEventListener('focusout',e=>{if(!card.contains(e.relatedTarget))scheduleAcquisition(3200);});
    scheduleAcquisition();
  }
  function revealAcquisition(ids) {
    const tiers=['Rare','Epic','Legendary','Mythic','Artifact'];
    ids.map(byId).filter(b=>b&&tiers.includes(b.tier)).forEach(b=>{if(acquisitionActive!==b.id&&!acquisitionQueue.includes(b.id))acquisitionQueue.push(b.id);});
    showNextAcquisition();
  }
  function revealCommitted(ids) {
    if(!app||!Array.isArray(ids))return;
    revealAcquisition([...new Set(ids.filter(id=>byId(id)&&owned(id)))]);
  }
  function checkUnlocks(options={}) {
    if(!app||checking)return [];
    checking=true;ensureState();
    const unlocked=[],created=new Map(),s=stats();
    for(let pass=0;pass<2;pass++)catalog.forEach(b=>{
      if(!owned(b.id)&&b.rule(s,app.state.artifacts,app.state.artifactInspected)){
        const record={earnedAt:Date.now()};app.state.artifacts[b.id]=record;created.set(b.id,record);unlocked.push(b.id);
      }
    });
    let committed=true;
    if(unlocked.length){try{committed=app.persist?.()!==false;}catch(_){committed=false;}}
    if(!committed){created.forEach((record,id)=>{if(app.state.artifacts[id]===record)delete app.state.artifacts[id];});checking=false;return [];}
    checking=false;
    if(options.announce!==false&&unlocked.length){
      app.toast?.(`${unlocked.length===1?'Artifact earned':'Artifacts earned'}: ${unlocked.map(id=>byId(id).name).join(' + ')}`);
      unlocked.forEach(id=>window.dispatchEvent(new CustomEvent('voidline:artifact-earned',{detail:{id,name:byId(id).name}})));
      revealAcquisition(unlocked);
    }
    return unlocked;
  }
  function collection() {
    const ctx=collectionContext,list=catalog.filter(b=>!ctx||ctx.ids.includes(b.id)),collected=ctx?list.length:catalog.filter(b=>owned(b.id)).length;
    const shown=list.filter(b=>ctx||filter==='all'||(filter==='owned'?owned(b.id):!owned(b.id)));
    app.modal(`<section class="va-archive${ctx?' va-sample-context':''}"><header class="va-archive-head"><div><div class="va-eyebrow">${ctx?'COMMUNITY PREVIEW / SAMPLE CABINET':'VOIDLINE / YOUR PRIVATE COLLECTION'}</div><h2>${ctx?`${esc(ctx.name)}’s cabinet`:'The Afterhours Archive'}<span>.</span></h2><p>${ctx?'A curated sample profile. Read-only inspiration.':'Small objects. A history of becoming.'}</p></div><div class="va-owned-count"><strong>${collected}<span> / ${ctx?list.length:catalog.length}</span></strong><small>${ctx?'ON THIS SAMPLE PROFILE':'IN YOUR COLLECTION'}</small></div></header><div class="va-archive-toolbar">${ctx?`<button type="button" class="va-back" data-vbadge-back-profile>← BACK TO ${esc(ctx.name.toUpperCase())}</button>`:`<div class="va-filter-tabs" role="group" aria-label="Filter artifacts">${[['all','All artifacts'],['owned','Collected'],['locked','Undiscovered']].map(([id,name])=>`<button type="button" class="${filter===id?'active':''}" data-vbadge-filter="${id}" aria-pressed="${filter===id}">${name}</button>`).join('')}</div>`}<span>${ctx?'SAMPLE DISPLAY':'COLLECTION 01 — AFTERHOURS'}</span></div><div class="va-artifact-grid">${shown.map(b=>{const has=!!ctx||owned(b.id);return `<button type="button" class="va-artifact-card ${has?'va-owned':'va-locked'} va-tier-${b.tier.toLowerCase()}" data-vbadge="${b.id}" aria-label="Inspect ${esc(b.name)}, ${b.tier}, ${ctx?'sample display':has?'collected':'locked'}"><div class="va-card-top"><span>${b.code}</span><span class="va-card-state">${ctx?'SAMPLE':has?(app.state.profile.badge===b.id?'DISPLAYED':'COLLECTED'):'LOCKED'}</span></div><div class="va-card-art">${art(b.id)}<span class="va-art-ground"></span></div><div class="va-card-info"><small>${b.tier==='Edition'?'EDITION MARK':b.tier.toUpperCase()}</small><strong>${b.name}</strong><span>${b.material}</span></div><span class="va-inspect-link">INSPECT ARTIFACT <span>↗</span></span></button>`;}).join('')||'<div class="va-archive-empty">Nothing in this view yet.<br>Your next transmission could change that.</div>'}</div><footer class="va-archive-footer"><span>${ctx?'Illustrative sample collection. No ownership or dates are claimed.':'Ownership and achievements are stored on this device.'}</span><span>${ctx?'Inspecting this cabinet does not modify your collection.':'Defined milestones. No random drops. No invented scarcity.'}</span></footer></section>`,{wide:true,className:'artifact-modal'});
    activeId='';
  }
  function inspect(id) {
    const b=byId(id);if(!b)return collection();
    const ctx=collectionContext;if(ctx&&!ctx.ids.includes(id))return collection();
    activeId=id;rotation=0;pitch=0;
    if(!ctx&&!app.state.artifactInspected.includes(id)){
      const previous=app.state.artifactInspected,next=[...previous,id];app.state.artifactInspected=next;
      let committed=true;try{committed=app.persist?.()!==false;}catch(_){committed=false;}
      if(!committed){if(app.state.artifactInspected===next)app.state.artifactInspected=previous;}else checkUnlocks({announce:true});
    }
    const has=!!ctx||owned(id),record=ctx?null:app.state.artifacts[id],earned=record?.earnedAt;
    const earnedText=ctx?'Sample display / no earned date':typeof earned==='number'&&Number.isFinite(earned)&&Math.abs(earned)<8640000000000000?new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(new Date(earned)):'Preserved from a previous edition';
    const sequence=ctx?catalog.filter(b=>ctx.ids.includes(b.id)):catalog,idx=sequence.indexOf(b),previous=sequence[(idx-1+sequence.length)%sequence.length],next=sequence[(idx+1)%sequence.length];
    app.modal(`<section class="va-inspection va-tier-${b.tier.toLowerCase()}${ctx?' va-sample-context':''}"><div class="va-inspect-nav"><button type="button" class="va-back" data-vcollection>← ${ctx?esc(ctx.name.toUpperCase())+'’S CABINET':'THE ARCHIVE'}</button><span>${b.code} / ${String(idx+1).padStart(2,'0')} OF ${String(sequence.length).padStart(2,'0')}</span></div><div class="va-inspect-grid"><div class="va-object-room"><div class="va-room-coordinates"><span>OBJECT / ${b.code}</span><span>LAYERED ARTWORK</span></div><div class="va-inspect-stage${b.shape==='unknown'?' va-is-classified':''}" data-vbadge-stage tabindex="0" role="group" aria-label="${esc(b.name)} layered artwork. Move your pointer to tilt, use arrow keys, or the view buttons. Press R to reset."><div class="va-object-halo"></div><div class="va-object-turntable">${art(id)}</div><div class="va-room-floor"></div></div><div class="va-rotation-tools"><button type="button" data-vbadge-turn="-1" aria-label="Tilt artifact left">↶</button><span>TILT TO INSPECT</span><button type="button" data-vbadge-reset aria-label="Reset artifact view">↺</button><button type="button" data-vbadge-turn="1" aria-label="Tilt artifact right">↷</button></div>${b.shape==='unknown'?'<button type="button" class="va-reveal-mark" data-vbadge-reveal aria-pressed="false">REVEAL CONCEALED MARK</button>':''}</div><div class="va-object-record"><div class="va-record-eyebrow">${ctx?'SAMPLE PROFILE / '+esc(ctx.name.toUpperCase()):b.collection}</div><span class="va-tier-label">${b.tier==='Edition'?'EDITION MARK':b.tier.toUpperCase()} <i></i> ${ctx?'SAMPLE DISPLAY':has?'COLLECTED':'LOCKED'}</span><h2>${b.name}</h2><p class="va-object-lore">${b.lore}</p><dl class="va-object-details"><div><dt>MATERIAL</dt><dd>${b.material}</dd></div><div><dt>ACQUIRED</dt><dd>${has?earnedText:'Not yet in your collection'}</dd></div><div><dt>PROVENANCE</dt><dd>${ctx?'Illustrative community profile':record?.legacy?'Preserved from your previous VOIDLINE profile':'This device / Afterhours edition'}</dd></div></dl><div class="va-unlock-condition"><span>${ctx?'PERSONAL COLLECTION MILESTONE':has?'AVAILABILITY / EARNED BY':'HOW TO ACQUIRE'}</span><p>${b.condition}</p>${!ctx&&!has?`<div class="va-unlock-progress">${esc(b.progress(stats(),app.state.artifacts,app.state.artifactInspected))}</div>`:''}</div>${ctx?'<button type="button" class="secondary-button va-equip-button" data-vbadge-back-profile>Return to the sample profile <span>↗</span></button>':has?`<button type="button" class="primary-button va-equip-button" data-vbadge-equip="${id}" ${app.state.profile.badge===id?'disabled':''}>${app.state.profile.badge===id?'Displayed on your profile':'Display on my profile'} <span>↗</span></button>`:'<div class="va-locked-note">This artifact unlocks automatically when its milestones are complete.</div>'}${b.tier==='Edition'?'<p class="va-provenance-note">Edition is a local arrival mark, separate from achievement tiers. It is available to every profile, with no global scarcity claim.</p>':b.tier==='Artifact'?'<p class="va-provenance-note">Artifact marks completion of this local archive. Its availability is defined by the milestones above.</p>':''}${ctx?'<p class="va-provenance-note">Sample cabinet only. No changes are made to your artifacts or profile.</p>':''}</div></div><footer class="va-inspect-footer"><button type="button" data-vbadge="${previous.id}">← ${previous.name}</button><span>THE AFTERHOURS ARCHIVE</span><button type="button" data-vbadge="${next.id}">${next.name} →</button></footer></section>`,{wide:true,className:'artifact-modal'});
  }
  function open(id) {if(!app)return;collectionContext=null;ensureState();checkUnlocks({announce:false});id?inspect(id):collection();}
  function openFor(ownerId,ids,displayName,inspectId) {
    if(!app)return;if(ownerId==='self')return open(inspectId);
    const valid=[...new Set((Array.isArray(ids)?ids:[]).filter(id=>byId(id)))];
    collectionContext={ownerId:String(ownerId||'sample'),name:String(displayName||'Sample profile').slice(0,40),ids:valid};
    filter='all';inspectId&&valid.includes(inspectId)?inspect(inspectId):collection();
  }
  function rotate(amount,vertical=0) {
    const stage=document.querySelector('[data-vbadge-stage]');if(!stage)return;
    rotation=Math.max(-36,Math.min(36,rotation+amount));pitch=Math.max(-20,Math.min(20,pitch+vertical));
    const object=stage.querySelector('.va-object-turntable');if(object)object.style.transform=`rotateY(${rotation}deg) rotateX(${pitch}deg)`;
  }
  function init(api) {
    app=api;ensureState();installMiniSprite();checkUnlocks({announce:false});
    if(bound)return;bound=true;
    const syncReveal=()=>{if(dialogOpen())clearTimeout(acquisitionTimer);else if(acquisitionActive)scheduleAcquisition();else showNextAcquisition();};
    document.addEventListener('close',syncReveal,true);
    const dialog=document.getElementById?.('app-modal');
    if(window.MutationObserver&&dialog)new window.MutationObserver(syncReveal).observe(dialog,{attributes:true,attributeFilter:['open']});
    document.addEventListener('click',e=>{
      const button=e.target.closest('button');if(!button)return;
      if(button.hasAttribute('data-vbadge-acquisition-close'))return dismissAcquisition();
      if(button.hasAttribute('data-vbadge-acquisition-inspect'))dismissAcquisition();
      if(button.hasAttribute('data-vbadge-back-profile')){const owner=collectionContext?.ownerId;collectionContext=null;return owner?window.VoidProfiles?.open(owner):collection();}
      if(button.hasAttribute('data-vcollection')){e.preventDefault();if(!button.closest('.va-sample-context'))collectionContext=null;return collection();}
      if(button.dataset.vbadge){e.preventDefault();if(!button.closest('.va-sample-context'))collectionContext=null;return inspect(button.dataset.vbadge);}
      if(button.dataset.vbadgeFilter){filter=button.dataset.vbadgeFilter;return collection();}
      if(button.dataset.vbadgeEquip){
        const id=button.dataset.vbadgeEquip;if(collectionContext||!byId(id)||!owned(id))return;
        const previous=app.state.profile.badge;app.state.profile.badge=id;
        let committed=true;try{committed=app.persist?.()!==false;}catch(_){committed=false;}
        if(!committed){if(app.state.profile.badge===id)app.state.profile.badge=previous;app.refresh?.();return;}
        app.refresh?.();inspect(id);app.toast?.(`${byId(id).name} is now on your profile.`);return;
      }
      if(button.hasAttribute('data-vbadge-turn'))return rotate(Number(button.dataset.vbadgeTurn)*12);
      if(button.hasAttribute('data-vbadge-reset')){rotation=0;pitch=0;return rotate(0);}
      if(button.hasAttribute('data-vbadge-reveal')){const stage=document.querySelector('[data-vbadge-stage]');if(!stage)return;const reveal=stage.classList.toggle('va-mark-revealed');button.setAttribute('aria-pressed',String(reveal));button.textContent=reveal?'CONCEAL MARK':'REVEAL CONCEALED MARK';}
    });
    document.addEventListener('pointermove',e=>{
      const stage=e.target.closest('[data-vbadge-stage]');if(!stage||!motionAllowed())return;
      const bounds=stage.getBoundingClientRect(),x=(e.clientX-bounds.left)/bounds.width-.5,y=(e.clientY-bounds.top)/bounds.height-.5;
      stage.style.setProperty('--va-light-x',`${(x+.5)*100}%`);stage.style.setProperty('--va-light-y',`${(y+.5)*100}%`);
      const object=stage.querySelector('.va-object-turntable');if(object)object.style.transform=`rotateY(${rotation+x*20}deg) rotateX(${pitch-y*16}deg)`;
    });
    document.addEventListener('pointerout',e=>{const stage=e.target.closest('[data-vbadge-stage]');if(!stage||stage.contains(e.relatedTarget))return;rotate(0);});
    document.addEventListener('keydown',e=>{
      const stage=e.target.closest?.('[data-vbadge-stage]');if(!stage)return;
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();rotate(e.key==='ArrowLeft'?-12:e.key==='ArrowRight'?12:0,e.key==='ArrowUp'?8:e.key==='ArrowDown'?-8:0);}
      if(e.key.toLowerCase()==='r'){e.preventDefault();rotation=0;pitch=0;rotate(0);}
    });
  }
  window.VoidBadges={init,open,openFor,mini,mark,art,cabinet,checkUnlocks,revealCommitted,catalog:catalog.map(({rule,progress,...b})=>b),has:owned};
})();
