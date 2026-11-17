/* Original VOIDLINE vector objects. Rendering never grants ownership or roles.
 * Compact silhouettes are authored on a 20px grid; larger art has separate material layers.
 * No remote resources, filters, scripts, text-as-path claims or financial metadata. */
(() => {
 'use strict';
 let serial=0;
 const paths={
  larp:'M32 5 54 13v18c0 15-22 27-22 27S10 46 10 31V13Z M20 23h6v17h15v6H20Z M36 20l7 11 7-11v22h-5V30l-2 5-2-5v12h-5Z',
  angel:'M30 25 20 15 4 10l5 18 13 7-10-2 9 12 8 1 3 13 3-13 8-1 9-12-10 2 13-7 5-18-16 5-10 10Z',
  ghost:'M32 8c-12 0-18 9-18 21l-4 27 11-5 11 7 11-7 11 5-4-27C50 17 44 8 32 8Z M23 27l7 4-7 5Z M41 27l-7 4 7 5Z',
  velvet:'M17 8C33-3 56 10 54 24c-3 16-35 18-29 28 4 5 15 4 21-1l-4 10C22 65 7 54 9 42c3-16 37-20 32-30-4-7-16-5-20 2v7L5 26 7 14Z',
  night:'M16 6h32l10 12v35L47 60H17L6 53V18Z M19 21h11v7h-5v6h5v8H19v-5h6v-1h-6v-9h6v-1h-6Z M37 21h11v7h-5v6h5v8H37v-5h6v-1h-6v-9h6v-1h-6Z',
  unknown:'M20 5H9L4 10v13h6V13l3-2h7Z M44 5h11l5 5v13h-6V13l-3-2h-7Z M4 41v13l5 5h11v-6h-7l-3-2V41Z M54 41v10l-3 2h-7v6h11l5-5V41Z M32 13 47 32 32 51 17 32Z M32 23 25 32l7 9 7-9Z',
  dead:'M31 5a27 27 0 0 0-7 53l4-7a20 20 0 0 1-5-3l4-9H8v-7h19l-4-9a21 21 0 0 1 9-4l-5-7Z M42 6l-7 8 8 13-9 12 9 15 3 3a27 27 0 0 0-4-51Z',
  voidwalker:'M32 2 40 12l10-1-2 13 12 8-6 10 6 14-14 1-5 6-9-6-9 6-5-6-14-1 6-14-6-10 12-8-2-13 10 1Z M32 14C16 24 14 40 20 50l12 8 12-8c6-10 4-26-12-36Z M32 25l9 14-9 13-9-13Z',
  orbit:'M32 21a11 11 0 1 0 0 22 11 11 0 0 0 0-22Z M5 42C-3 27 48 1 59 17c8 15-43 41-54 25Z M10 40c8 10 50-13 44-21-7-10-49 14-44 21Z',
  'coin-bitforge':'M32 4a28 28 0 1 0 0 56 28 28 0 0 0 0-56Z M32 11a21 21 0 1 1 0 42 21 21 0 0 1 0-42Z M22 17h16l9 8-6 8 6 7-9 9H22v-7h6V24h-6Z M34 24v7h4l3-4-4-3Z M34 36v6h4l3-3-4-3Z',
  'coin-etherglass':'M30 3 50 20 43 43 29 61 13 37 14 17Z M30 12l-9 9 8 12 12-11Z M29 40l-6 2 7 10 6-10Z',
  'coin-crosssignal':'M7 13h11l14 14 14-14h11L36 35h-8Z M7 53h11l14-14 14 14h11L36 31h-8Z',
  'coin-solarstack':'M15 8h44L48 20H4Z M4 27h44l11 12H15Z M15 46h44L48 58H4Z',
  'coin-moonshibe':'M11 8l16 7h10l16-7-1 24 4 15-14 13H22L8 47l4-15Z M21 28l5 2-5 5Z M43 28l-5 2 5 5Z M24 43l8-5 8 5-8 8Z',
  'coin-diamondhands':'M23 5h18l9 12-18 21L14 17Z M8 30l12 7 7 12h10l7-12 12-7 5 10-10 13-13 9H26l-13-9L3 40Z',
  'meme-grass':'M9 48 5 29l14 10L17 11l17 22 8-27 5 32 13-17-7 28-9 8H20Z M12 56h40v6H12Z',
  'meme-npc':'M12 22h30v31l-9 8H21l-9-8Z M19 32h6v6h-6Z M31 32h5v6h-5Z M21 46h14v4H21Z M35 4h25v18H49l-8 8v-8h-6Z M42 11h3v4h-3Z M50 11h3v4h-3Z',
  'meme-yapper':'M26 5h12l7 7v22l-7 7H26l-7-7V12Z M11 27h5v9l10 10h12l10-10v-9h5v12L40 51h-5v8h11v5H18v-5h11v-8h-5L11 39Z',
  'meme-copium':'M24 4h16v7h-5v5h9l7 10v30l-7 6H20l-7-6V26l7-10h9v-5h-5Z M22 28v23h20V28Z M36 6h13l11 12-4 5-11-11h-9Z',
  'meme-cooked':'M5 34h41v10L36 56H15L5 44Z M46 36h16v8H46Z M16 29c-7-8 2-15 8-20-2 9 10 7 7-6 20 16 8 27-3 27-5 0-9-1-12-1Z',
  'meme-terminal':'M5 8h54v39H5Z M11 14v26h42V14Z M27 47h10v8h13v6H14v-6h13Z M16 20l8 6-8 6-3-4 4-2-4-2Z M29 30h15v4H29Z',
  'gift-rose':'M30 30c-19 2-24-17-10-20 0-13 21-13 24-3 17-2 24 15 12 23 4 17-15 23-25 12-12 7-24-3-16-14Z M32 19l-9 9 11 9 11-11-7-8Z M29 42h6v17h-6Z M34 49l13-6-4 11-9 2Z',
  'gift-cassette':'M9 11h46a6 6 0 0 1 6 6v34a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6V17a6 6 0 0 1 6-6Z M13 19v17h38V19Z M22 42l-5 9h30l-5-9Z',
  'gift-star':'M32 4l8 18 20 3-15 14 4 21-17-10-17 10 4-21L4 25l20-3Z M32 15v28l13-12-11-1Z',
  'gift-cup':'M10 18h37v24c0 15-37 15-37 0Z M47 23h6c13 0 11 21-6 21v-7c9 0 11-8 0-8Z M7 57h45v4H7Z',
  'gift-ghost':'M32 5c-14 0-21 12-21 27L8 56l13-5 11 8 11-8 13 5-3-24C53 17 46 5 32 5Z M22 24h6v9h-6Z M37 24h6v9h-6Z M28 40h9v4h-9Z',
  'gift-parcel':'M7 19l25-9 25 9v34l-25 9-25-9Z M7 19l25 9 25-9 M32 28v34 M22 14l25 9v34 M17 23v34 M31 13C10 12 13-3 25 4l7 9c20-1 20-16 9-12Z',
  'gift-seraph':'M31 23 18 12 3 9l4 18 16 9-12-3 12 14 8-4 1 17 3-17 8 4 12-14-12 3 16-9 4-18-15 3-13 11Z M31 22l9 12-8 15-8-15Z',
  'gift-key':'M24 5a17 17 0 1 0 9 31l10 10-5 5 6 6 5-5 6 6 7-8-27-27A17 17 0 0 0 24 5Z M21 13a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z',
  'gift-halo':'M31 4A27 27 0 0 0 8 45l8-3A19 19 0 0 1 29 12Z M39 5l-3 8a19 19 0 0 1 11 29l6 6A27 27 0 0 0 39 5Z M17 50l-4 7a27 27 0 0 0 31 2l-4-8a19 19 0 0 1-23-1Z',
  'gift-orchid':'M32 29C8 27 2 8 15 5c12-2 18 12 17 24ZM33 29C31 7 48-1 56 9c7 10-8 23-23 20ZM32 32C5 23-3 41 8 48c10 7 22-3 24-16ZM35 33c12-19 31-11 27 2-4 12-16 11-27-2ZM33 35c-21 7-18 28-5 28 14 1 20-17 5-28Z M25 28l8-5 8 6-4 10-9 1Z',
  'gift-signal':'M5 15l27-8 27 8v39l-27 9-27-9Z M5 16l27 21 27-21 M5 54l20-22 M59 54 39 32 M25 33l8-7 9 6-2 12-12 2Z',
  'gift-ticket':'M7 8h50v12a8 8 0 0 0 0 16v24H7V36a8 8 0 0 0 0-16Z M15 15h29v5H15Z M15 24h18v3H15Z M15 41h28v3H15Z M15 48h21v3H15Z M47 11h5v12h-5Z M47 40h5v14h-5Z'
 };

 const miniPaths={
  larp:'M10 1 18 4v6c0 4-8 9-8 9S2 14 2 10V4Z M6 6v7h5v-2H8V6Z M12 6l2 3 2-3v7h-2V10l-2-2Z',
  angel:'M9 7 5 3 1 2l1 7 5 3-3-1 3 4h2l1 4 1-4h2l3-4-3 1 5-3 1-7-4 1-4 4Z',
  ghost:'M10 2C6 2 4 5 4 9L2 18l5-2 3 3 3-3 5 2-2-9c0-4-2-7-6-7Z M6 8h2v3H6Z M12 8h2v3h-2Z',
  velvet:'M6 2C13-2 20 4 17 8c-3 5-13 4-11 8 1 2 5 2 8 0l-1 3C6 21 1 17 2 13c1-5 13-6 12-9-1-2-5-2-7 0v3L1 8l1-5Z',
  night:'M5 1h10l4 4v12l-4 2H5l-4-2V5Z M5 6h4v3H7v2h2v3H5v-2h2v-1H5V8h2V7H5Z M12 6h4v3h-2v2h2v3h-4v-2h2v-1h-2V8h2V7h-2Z',
  unknown:'M1 1h5v2H3v3H1Z M14 1h5v5h-2V3h-3Z M1 14h2v3h3v2H1Z M17 14h2v5h-5v-2h3Z M10 4l5 6-5 6-5-6Z M10 7l-2 3 2 3 2-3Z',
  dead:'M9 1a9 9 0 0 0-2 18l1-3-3-2 2-3H1V9h6L5 6l4-2-1-2Z M13 1l-3 4 4 4-3 4 3 6a9 9 0 0 0-1-18Z',
  voidwalker:'M10 0l3 4h4v4l3 2-2 4 2 4h-5l-2 2-3-2-3 2-2-2H0l2-4-2-4 3-2V4h4Z M10 5l-4 7 4 5 4-5Z M10 9l1 3-1 2-1-2Z',
  orbit:'M10 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M1 15C-3 10 14 0 19 5c4 5-14 16-18 10Z M3 14c3 3 15-5 14-7-3-3-15 5-14 7Z',
  'coin-bitforge':'M10 1a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z M7 5h5l3 3-2 2 2 2-3 3H7v-2h1V7H7Z M10 7v2h2l1-1-1-1Z M10 11v2h2l1-1-1-1Z',
  'coin-etherglass':'M10 1 17 6l-2 8-5 5-7-8 1-6Z M10 4 6 7l4 4 4-4Z M10 13l-2 1 2 3 2-3Z',
  'coin-crosssignal':'M1 3h4l5 5 5-5h4l-7 8H8Z M1 17h4l5-5 5 5h4l-7-8H8Z',
  'coin-solarstack':'M5 2h14l-4 4H1Z M1 8h14l4 4H5Z M5 14h14l-4 4H1Z',
  'coin-moonshibe':'M3 2l5 2h4l5-2v8l1 5-5 4H7l-5-4 1-5Z M6 8l2 1-2 2Z M14 8l-2 1 2 2Z M7 13l3-1 3 1-3 3Z',
  'coin-diamondhands':'M7 1h6l3 4-6 6-6-6Z M2 10l5 3 2 3h2l2-3 5-3 2 3-4 4-4 3H8l-4-3-4-4Z',
  'meme-grass':'M3 15 1 8l5 4L5 2l6 8 3-9 1 11 4-6-2 10-3 2H6Z M3 18h14v2H3Z',
  'meme-npc':'M3 6h10v11l-3 3H6l-3-3Z M5 10h2v2H5Z M9 10h2v2H9Z M6 15h5v1H6Z M11 1h9v6h-4l-3 3V7h-2Z',
  'meme-yapper':'M8 1h4l3 3v7l-3 3H8l-3-3V4Z M2 8h2v4l4 4h4l4-4V8h2v5l-5 5h-2v2H9v-2H7l-5-5Z',
  'meme-copium':'M7 1h6v2h-2v2h3l3 4v9l-3 2H6l-3-2V9l3-4h3V3H7Z M6 9v7h8V9Z M12 1h4l4 4-2 2-3-4h-3Z',
  'meme-cooked':'M1 10h13v4l-4 4H5l-4-4Z M14 11h6v3h-6Z M5 9C3 5 8 4 8 1c1 3 3 4 3 0 7 6 2 9-2 9Z',
  'meme-terminal':'M1 2h18v13H1Z M3 4v8h14V4Z M8 15h4v3h4v2H4v-2h4Z M5 6l3 2-3 3-1-1 2-2-2-1Z M10 9h4v1h-4Z',
  'gift-rose':'M9 1C5-1 1 3 3 7c-4 3 0 9 5 7l1 5h2v-5c5 2 9-3 6-7 2-4-4-8-8-6Z M10 4l4 4-4 4-4-4Z M11 16l6-2-2 4h-4Z',
  'gift-cassette':'M3 3h14l2 2v12H1V5Z M4 6v5h12V6Z M6 14l-2 3h12l-2-3Z',
  'gift-star':'M10 1l3 5 6 1-4 5 1 7-6-4-6 4 1-7-4-5 6-1Z',
  'gift-cup':'M3 6h11v8c0 5-11 5-11 0Z M14 7h3c5 0 4 7-3 7v-2c4 0 4-3 0-3Z M2 18h14v2H2Z',
  'gift-ghost':'M10 1C5 1 3 5 3 10L2 18l5-2 3 3 3-3 5 2-1-8c0-5-2-9-7-9Z M6 7h2v3H6Z M12 7h2v3h-2Z',
  'gift-parcel':'M2 6l8-3 8 3v11l-8 3-8-3Z M2 6l8 3 8-3 M10 9v11 M6 5l8 3v10 M10 4C3 3 5-2 8 1l2 3c6 0 7-6 3-4Z',
  'gift-seraph':'M9 7 5 3 0 2l1 7 6 3-3-1 3 4h2l1 5 1-5h2l3-4-3 1 6-3 1-7-5 1-4 4Z M10 7l3 4-3 5-3-5Z',
  'gift-key':'M7 1a6 6 0 1 0 3 11l3 3-2 2 2 2 2-2 2 2 3-3-9-9a6 6 0 0 0-4-6Z M6 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  'gift-halo':'M9 1A9 9 0 0 0 2 14l3-1A6 6 0 0 1 9 4Z M13 1l-1 3a6 6 0 0 1 4 9l2 2a9 9 0 0 0-5-14Z M6 16l-2 2a9 9 0 0 0 12 1l-1-3a6 6 0 0 1-9 0Z',
  'gift-orchid':'M10 9C1 8 1 0 5 1c4 0 5 4 5 8Z M11 9C10 2 16 0 18 3c2 3-3 7-7 6Z M10 10C1 6-1 13 3 15c3 2 6-2 7-5Z M11 10c4-6 11-3 8 1-1 4-5 4-8-1Z M10 11c-7 2-6 9-1 9 4 0 6-5 1-9Z',
  'gift-signal':'M1 5l9-3 9 3v12l-9 3-9-3Z M1 5l9 7 9-7 M8 10l3-2 3 2-1 4-4 1Z',
  'gift-ticket':'M3 1h14v5a3 3 0 0 0 0 6v7H3v-7a3 3 0 0 0 0-6Z M5 4h7v2H5Z M5 13h7v1H5Z M14 2h2v5h-2Z M14 13h2v5h-2Z'
 };
 const materials={
  larp:['metal','#d7deeb','#657283'],angel:['metal','#eff3ff','#727f94'],ghost:['glass','#d5e4e4','#435967'],velvet:['metal','#d3c0ed','#624e82'],night:['enamel','#b8c3da','#303b57'],unknown:['glass','#d8d7f6','#5c668e'],dead:['metal','#bdd1bf','#546d60'],voidwalker:['metal','#aeb8ca','#293547'],orbit:['metal','#e2dfed','#7d7199'],
  'coin-bitforge':['metal','#efbf8b','#9b5c3d'],'coin-etherglass':['glass','#d6bff8','#6f518b'],'coin-crosssignal':['enamel','#dce4ee','#485465'],'coin-solarstack':['metal','#b7dec9','#7661a6'],'coin-moonshibe':['metal','#edd19f','#a0824a'],'coin-diamondhands':['glass','#d0ecf5','#5e8799'],
  'meme-grass':['enamel','#a9c99e','#4b7052'],'meme-npc':['ceramic','#e5d6c1','#a89885'],'meme-yapper':['metal','#ecbaa7','#956254'],'meme-copium':['glass','#b6d5bc','#3d6b51'],'meme-cooked':['enamel','#e9bd83','#5f5a50'],'meme-terminal':['glass','#b9d4d9','#3d6370'],
  'gift-rose':['metal','#e7c1d0','#8b526c'],'gift-cassette':['glass','#c9d3e1','#4e6175'],'gift-star':['glass','#dec7f2','#80639c'],'gift-cup':['ceramic','#e5d4ba','#9d8066'],'gift-ghost':['paper','#e8e1ef','#a19aac'],'gift-parcel':['paper','#bab7dc','#565272'],'gift-seraph':['metal','#e3eaf1','#63798e'],'gift-key':['glass','#b3a892','#292b39'],'gift-halo':['enamel','#ddc58e','#8a784b'],'gift-orchid':['glass','#d4b2de','#604365'],'gift-signal':['paper','#cbd9cf','#758779'],'gift-ticket':['paper','#e0d2b0','#9b8967']
 };
 const details={
  larp:'<path d="M15 17 32 11l17 6v14c0 9-17 21-17 21S15 40 15 31Z" fill="none" stroke="{light}" stroke-width=".7" opacity=".65"/><path d="M16 19h8m-8 3h5m23 17h5m-7 3h7" stroke="{dark}" stroke-width=".7" opacity=".7"/>',
  angel:'<ellipse cx="32" cy="7" rx="9" ry="3" fill="none" stroke="{light}" stroke-width="1.7"/><path d="m8 16 17 13m-13-5 13 9m31-17L39 29m13-5-13 9" stroke="{light}" opacity=".7"/>',
  ghost:'<path d="M17 38c8-4 21 4 30-1M16 43c8-3 23 4 31-1" fill="none" stroke="{light}" opacity=".5"/><path d="M20 19c2-4 5-6 10-7" fill="none" stroke="{light}" stroke-width="1.5"/>',
  velvet:'<path d="M13 40c5-10 32-16 34-24M20 53c5 3 15 2 20-1" fill="none" stroke="{light}" stroke-width="1.3" opacity=".6"/>',
  night:'<path d="M12 19v30l8 5h24l8-5V19" fill="none" stroke="{light}" opacity=".45"/><circle cx="32" cy="51" r="1.5" fill="{light}"/>',
  unknown:'<path d="m32 14-1 18 16 0m-16 0 1 18-15-18" stroke="{light}" fill="none" opacity=".6"/>',
  dead:'<path d="M8 25c6-7 15-10 22-10M8 40c5 7 12 11 18 11m10-40c10 5 16 12 18 21" fill="none" stroke="{light}" opacity=".55"/>',
  voidwalker:'<path d="m32 15-9 23 9 19 9-19Z" fill="none" stroke="{light}" opacity=".4"/>',
  orbit:'<path d="M27 24a9 9 0 0 0-3 12" fill="none" stroke="{light}" stroke-width="2"/><circle cx="52" cy="18" r="3" fill="{light}"/>',
  'coin-bitforge':'<circle cx="32" cy="32" r="23.5" fill="none" stroke="{light}" stroke-dasharray="1 2" stroke-width="1.5"/><path d="M27 12v7m10-7v7M27 47v7m10-7v7" stroke="{light}" stroke-width="2"/>',
  'coin-etherglass':'<path d="m30 4-1 29-15 4m15-4 14 10m-14-10 21-13M29 40l1 20" fill="none" stroke="{light}" stroke-width="1.5" opacity=".8"/>',
  'coin-crosssignal':'<path d="m9 15 22 20 22-20M9 51l22-20 22 20" fill="none" stroke="{light}" opacity=".4"/><circle cx="32" cy="33" r="4" fill="{dark}" stroke="{light}"/>',
  'coin-solarstack':'<path d="M16 12h32M16 31h27M17 50h31" stroke="{light}" stroke-width="1.4" opacity=".65"/>',
  'coin-moonshibe':'<path d="M27 53h10M18 42l5 8m23-8-5 8" fill="none" stroke="{dark}" stroke-width="2" stroke-linecap="round"/><path d="M56 3a9 9 0 0 0 3 16A11 11 0 0 1 56 3Z" fill="{light}"/>',
  'coin-diamondhands':'<path d="m14 17 18 2 18-2M23 5l9 14L41 5M32 19v19M11 39l12 9m30-9-12 9" fill="none" stroke="{light}" stroke-width="1.5"/>',
  'meme-grass':'<path d="m24 47-5-19m15 20 7-26m0 27 10-17" fill="none" stroke="{light}" stroke-width="1.5" stroke-linecap="round"/><path d="M14 58h36" stroke="{dark}"/>',
  'meme-npc':'<path d="M14 24h26M15 55h24" stroke="{light}" stroke-width="1.5"/><circle cx="43" cy="13" r="1" fill="{dark}"/><circle cx="51" cy="13" r="1" fill="{dark}"/>',
  'meme-yapper':'<path d="M23 17h18M23 23h18M23 29h18M52 9l6-3m-7 12h10" fill="none" stroke="{light}" stroke-width="1.8" stroke-linecap="round"/>',
  'meme-copium':'<path d="M19 25v27M28 32v15m8-15v15M20 57h24" fill="none" stroke="{light}" stroke-width="1.6" opacity=".7"/><path d="M23 30h16v18H23Z" fill="{dark}" opacity=".35"/>',
  'meme-cooked':'<path d="M10 39h31M19 47h14" stroke="#d7dce2" stroke-width="1.6" stroke-linecap="round"/><path d="M26 26c-6-6 0-7 1-11 8 7 4 10-1 11Z" fill="#efd09b"/>',
  'meme-terminal':'<path d="M7 11h50M9 44h46" stroke="{light}" stroke-width="1.5" opacity=".7"/><circle cx="48" cy="44" r="1.3" fill="#c8dcb9"/>'
 };
 function definitions(key,kind,light,dark){
  const gradient=(id,stops)=>`<linearGradient id="${key}-${id}" x1="0" y1="0" x2=".8" y2="1">${stops.map(([offset,color])=>`<stop offset="${offset}" stop-color="${color}"/>`).join('')}</linearGradient>`;
  const stops=kind==='metal'?[[0,light],[.21,'#f1f1ed'],[.42,dark],[.48,light],[.75,dark],[1,light]]:kind==='glass'?[[0,light],[.35,dark],[.7,dark],[1,light]]:kind==='ceramic'?[[0,light],[.6,light],[1,dark]]:kind==='paper'?[[0,light],[1,dark]]:[[0,light],[.2,light],[.8,dark],[1,dark]];
  return `<defs>${gradient('surface',stops)}${gradient('edge',[[0,'#f6f3ed'],[.45,light],[1,dark]])}${gradient('shade',[[0,dark],[1,'#171923']])}</defs>`;
 }
 function gift(id,key){
  const s=`url(#${key}-surface)`,edge=`url(#${key}-edge)`,shade=`url(#${key}-shade)`;
  const objects={
   'gift-cassette':`<path d="M8 14h47l5 5v36l-5 4H8l-5-4V19Z" fill="${shade}" stroke="#7c8d9b"/><path d="M8 12h46l5 5v35l-5 4H8l-5-4V17Z" fill="${s}" stroke="#d3dae1" stroke-width=".8"/><path d="M10 18h42v21H10Z" fill="#1c2633" stroke="#7c8c9f"/><path d="M12 20h38v17H12Z" fill="#657c8f" opacity=".4"/><g class="vc-tape-path"><path d="M20 29h23M17 35h29l4 12H13Z" fill="none" stroke="#b0a0a0" stroke-width="1.7"/></g><g class="vc-reel vc-reel-left"><circle cx="20" cy="28" r="7" fill="${edge}"/><circle cx="20" cy="28" r="4.4" fill="#2b3441"/><path d="M20 23v10m-5-5h10" stroke="#c3cbd3" stroke-width="1.3"/><circle cx="20" cy="28" r="1.6" fill="#c3cbd3"/></g><g class="vc-reel vc-reel-right"><circle cx="43" cy="28" r="7" fill="${edge}"/><circle cx="43" cy="28" r="4.4" fill="#2b3441"/><path d="M43 23v10m-5-5h10" stroke="#c3cbd3" stroke-width="1.3"/><circle cx="43" cy="28" r="1.6" fill="#c3cbd3"/></g><path d="M23 43h17l5 10H18Z" fill="#a9b7c4" stroke="#d8dfe6" stroke-width=".6"/><path d="M26 48h12" stroke="#455263" stroke-width="2"/><path d="M8 16h47" stroke="#eef2f3" opacity=".55"/><circle cx="8" cy="51" r="1.3" fill="#334150"/><circle cx="54" cy="51" r="1.3" fill="#334150"/>`,
   'gift-rose':`<path d="M30 37v23h3V35" fill="${shade}" stroke="#c7bdc5" stroke-width=".7"/><path d="M32 48c6-7 14-5 16-4-2 7-9 10-16 8Z" fill="${s}" stroke="#b9adb6"/><g class="vc-rose-petals"><path d="M30 12C20 1 8 10 13 22-2 30 10 45 23 39c3 12 19 11 21 0 15 1 21-14 9-22C52 4 36 1 30 12Z" fill="${s}" stroke="#e8c9d6" stroke-width=".7"/><path d="M30 13C17 10 14 23 24 29c-9 8 4 17 12 10 12 5 19-7 10-14 7-10-7-18-16-12Z" fill="${shade}" stroke="#c79bad"/><path d="M22 23c3-10 19-10 22 0l-7 12-12-3Z" fill="${s}" stroke="#edc7d6"/><path d="M24 23l11-4 7 7-9 7Z" fill="${edge}"/><path d="m27 26 7-4 5 4-6 3Z" fill="#735264"/></g><path class="vc-rose-glint" d="M17 17c3-4 6-5 10-4m14 5 6 5" fill="none" stroke="#fff0f2" stroke-width="1.3" stroke-linecap="round"/>`,
   'gift-cup':`<ellipse cx="29" cy="59" rx="24" ry="3" fill="${shade}"/><path d="M6 56c8 4 36 4 45 0l-3 4H9Z" fill="${s}" stroke="#cbbba4"/><path d="M45 25h7c12 0 11 22-7 22v-5c11-1 13-12 1-12Z" fill="${s}" stroke="#decdb6"/><path d="M10 22h36l-3 24c-1 11-29 11-30 0Z" fill="${s}" stroke="#e4d7c2" stroke-width=".8"/><ellipse cx="28" cy="22" rx="18" ry="5" fill="#ad9073" stroke="#eee0cc" stroke-width="1.8"/><ellipse cx="28" cy="22" rx="14.5" ry="3" fill="#493b32"/><path d="M15 29l2 15c1 4 3 5 6 5" fill="none" stroke="#f3e7d3" stroke-width="1.5" opacity=".7"/><path d="M24 41c4 2 8 2 12 0" fill="none" stroke="#9f7c65" stroke-width="1.1"/><g class="vc-steam" fill="none" stroke="#d8d4d2" stroke-width="1.2" stroke-linecap="round"><path d="M22 13c-5-4 4-6 0-10"/><path d="M31 14c-5-5 4-8 0-12"/><path d="M39 13c-3-3 3-5 1-8"/></g>`,
   'gift-ghost':`<path d="M17 16 32 6l15 10 7 41-13-6-9 8-10-8-12 6Z" fill="${s}" stroke="#e3ddec" stroke-width=".7"/><path d="M17 16 32 6v53L22 45l-12 12Z" fill="#eeebf1" opacity=".65"/><path class="vc-paper-fold" d="m32 6 4 33 18 18-13-6-9 8V6" fill="#afa5bc" opacity=".6"/><path d="m17 16 15 8 15-8M22 45l10-6 9 12" fill="none" stroke="#b4a9bd" stroke-width=".7"/><g class="vc-ghost-expression" fill="#575367"><ellipse cx="24" cy="29" rx="2.1" ry="3"/><ellipse cx="40" cy="29" rx="2.1" ry="3"/><path d="M28 39q4 4 8 0" fill="none" stroke="#575367" stroke-width="1.3" stroke-linecap="round"/></g><path d="M20 17 29 12" stroke="#fff" stroke-width="1"/>`,
   'gift-key':`<path d="M23 7a16 16 0 1 0 7 30l10 10-4 4 6 6 5-4 7 7 6-7-26-26A16 16 0 0 0 23 7Z" fill="${shade}" stroke="#a6a596" stroke-width=".9"/><path d="M22 5a16 16 0 1 0 8 30l10 10-4 4 6 6 5-4 7 7 6-7-26-26A16 16 0 0 0 22 5Z" fill="${s}" fill-rule="evenodd" stroke="#c2baa1" stroke-width=".8"/><circle cx="21" cy="19" r="7" fill="#141922" stroke="#9b9d98" stroke-width="1.7"/><circle cx="21" cy="19" r="10" fill="none" stroke="#8b8b83" stroke-width=".6"/><path d="m33 32 19 19-4 4-5-5 4-4-7-7" fill="none" stroke="#777a80" stroke-width="1.1"/><path d="m47 51 5-5 7 6-5 6Z" fill="#b09b64"/><path class="vc-key-glint" d="M13 9c3-2 6-3 9-3m15 26 13 13" fill="none" stroke="#e5d8b7" stroke-width="1.3"/>`,
   'gift-orchid':`<g class="vc-orchid-petal vc-orchid-left"><path d="M32 31C9 27 4 11 15 7c11-4 19 12 17 24ZM31 33C9 25 0 42 11 48c10 6 19-3 20-15Z" fill="${s}" stroke="#d6b4de" stroke-width=".7"/><path d="M14 13c8 4 12 9 18 18M12 44l19-11" fill="none" stroke="#dfc5e5" opacity=".45"/></g><g class="vc-orchid-petal vc-orchid-right"><path d="M33 31C31 9 47 1 55 12c7 9-8 21-22 19ZM35 33c12-17 29-10 25 3-4 10-15 9-25-3Z" fill="${s}" stroke="#c5a0ce" stroke-width=".7"/><path d="M49 14 33 31m21 7-19-5" fill="none" stroke="#dfc5e5" opacity=".4"/></g><path d="M32 34c-19 6-16 27-4 26 13 0 19-16 4-26Z" fill="${shade}" stroke="#bb94c6"/><path d="m25 30 8-5 8 6-4 10-9 1Z" fill="#b49c66" stroke="#e6d4a6" stroke-width=".7"/><path d="m30 30 6 3-3 7-4-5Z" fill="#eee0bf"/>`,
   'gift-signal':`<path d="M5 18 32 9l27 9v34l-27 9-27-9Z" fill="${shade}" stroke="#a4b7a8" stroke-width=".7"/><path d="M5 16 32 7l27 9v35l-27 9-27-9Z" fill="${s}" stroke="#e1e8df" stroke-width=".7"/><path d="m5 16 27 21 27-21" fill="#a5b9ac" stroke="#e5e9e1" stroke-width=".8"/><path d="M5 51 24 32m35 19L40 32" fill="none" stroke="#738c7c" stroke-width=".8"/><g class="vc-signal-core"><path d="m25 30 8-5 9 7-3 12-11 1-6-8Z" fill="#658777" stroke="#bed0ba" stroke-width=".8"/><path d="m28 35 3 3 5-7m-8 4 3 3 5-7" fill="none" stroke="#d4ddc8" stroke-width="1.3"/></g><path class="vc-signal-pulse" d="M20 29a18 18 0 0 1 24 0m-28-5a25 25 0 0 1 32 0" fill="none" stroke="#bdcfb8" stroke-width="1.1" opacity="0"/>`,
   'gift-parcel':`<path d="m7 26 25-8 25 8v28l-25 9-25-9Z" fill="${shade}" stroke="#b3adc7" stroke-width=".8"/><path d="M7 26 32 35v28L7 54Z" fill="#646080"/><path d="m32 35 25-9v28l-25 9Z" fill="#49465f"/><path d="M18 30v28l5 2V32m18 0v28l5-2V30" fill="#b8b2cc"/><g class="vc-parcel-surprise" opacity="0"><path d="m31 15 3 6 7 1-5 4 1 7-6-4-6 4 1-7-5-4 7-1Z" fill="#d9c99e"/></g><g class="vc-parcel-lid"><path d="m5 22 27-9 27 9v8l-27 9-27-9Z" fill="${s}" stroke="#d4cbe3" stroke-width=".8"/><path d="m5 22 27 9 27-9m-27 9v8" fill="none" stroke="#e0d9ed" stroke-width=".8"/><path d="m20 17 27 9v8l-7 2v-8l-27-9Z" fill="#cfcbdf"/><path d="M31 16C14 16 13 2 24 6l8 10c19 1 20-14 10-12l-10 12Z" fill="none" stroke="#d3cde4" stroke-width="2.5"/></g>`,
   'gift-star':`<path d="m32 7 9 18 19 3-14 14 3 19-17-9-17 9 3-19L4 28l19-3Z" fill="${s}" stroke="#e5d5f1" stroke-width=".8"/><path d="m32 7 1 27L4 28l20 10-9 23 17-17 17 17-7-23 18-10-27 6Z" fill="#cbb2df" opacity=".55"/><path class="vc-crystal-glint" d="m32 14 1 20 12-3m-12 3-8 9" fill="none" stroke="#f0e2f8" stroke-width="1.2"/><path d="m33 34-1 10 10-6Z" fill="#715789" opacity=".6"/>`,
   'gift-seraph':`<g class="vc-seraph-wings"><path d="M31 25 19 14 4 11l4 17 16 9-13-3 11 13 10-3 10 3 11-13-13 3 16-9 4-17-15 3-13 11Z" fill="${s}" stroke="#dde8ed" stroke-width=".7"/><path d="m8 16 19 17m-15-9 14 13m30-21L37 33m15-9L38 37" stroke="#b4cad9" stroke-width="1.2"/></g><path d="m32 23 9 13-9 20-9-20Z" fill="#526d86" stroke="#bcd3df"/><path d="m32 27 5 9-5 12-5-12Z" fill="#c1dce5"/><path class="vc-seraph-core" d="m32 32 2 4-2 6-2-6Z" fill="#f2f3ec"/>`,
   'gift-halo':`<g class="vc-halo-segments"><path d="M29 8A24 24 0 0 0 9 44l7-3a16 16 0 0 1 12-25Z" fill="${s}" stroke="#e1cc9d" stroke-width=".8"/><path d="m37 9-2 8a16 16 0 0 1 11 24l6 6A24 24 0 0 0 37 9Z" fill="${s}" stroke="#e1cc9d" stroke-width=".8"/><path d="m20 47-5 6a24 24 0 0 0 31-1l-5-6a16 16 0 0 1-21 1Z" fill="${s}" stroke="#e1cc9d" stroke-width=".8"/></g><path d="m29 11 7 1-1 5-7-1ZM12 43l6 5-3 5-7-5Zm34-2 5 4-5 7-5-6Z" fill="#717d79" stroke="#bdc6ad" stroke-width=".6"/><path class="vc-halo-glint" d="M12 25a21 21 0 0 1 10-11" fill="none" stroke="#f4dfb5" stroke-width="1.4"/>`,
   'gift-ticket':`<path d="M12 7h38v14c-9 0-9 12 0 12v27H12V33c9 0 9-12 0-12Z" fill="${s}" stroke="#dfd3b5" stroke-width=".8"/><path d="M16 11h30v45H16Z" fill="none" stroke="#a6926b" stroke-width=".7"/><path d="M20 16h17m-17 4h11m-11 20h18m-18 4h12" stroke="#76654d" stroke-width="1.4"/><path d="M19 50h2m2 0h1m2 0h2m2 0h1m2 0h3" stroke="#76654d" stroke-width="4"/><path d="M12 36h38" stroke="#a79570" stroke-dasharray="1.5 2"/><g class="vc-ticket-clip"><path d="M41 4h7v21h-3V8h-1v14c0 4-5 4-5 0V10" fill="none" stroke="#cad1d8" stroke-width="2.3"/><path d="M42 6h4" stroke="#f0f1ec"/></g>`
  };
  return objects[id]||'';
 }
 function earned(id,mini=false){
  const profile=id==='profile-authored',safe=profile?'profile-authored':id==='reviewed-contribution'?'reviewed-contribution':'earned';
  const compact=profile?'<path d="M3 2h11l3 3v13H3Z M5 4v12h10V6l-2-2Z M6 11l6-6 3 3-6 6-3 1Z"/>':'<path d="M10 1 16 5v6l-6 4-6-4V5Z M10 4l-3 2v3l3 3 3-3V6Z M4 12l4 3-2 5-2-3-3 1Z M16 12l-4 3 2 5 2-3 3 1Z"/>';
  const full=profile?'<path d="M16 5h29l9 9v45H16Z" fill="#263a34" stroke="#b9d4bd"/><path d="M22 12h19l7 6v34H22Z" fill="#bcd1bd"/><path d="m25 37 17-18 8 8-18 18-9 3Z" fill="#f0e2b8" stroke="#405f4d" stroke-width="1.5"/><path d="m25 37 7 8m-5-4-4 7 9-3m6-22 8 8" fill="none" stroke="#5b765e" stroke-width="1.2"/><path d="M27 17h9M27 21h5" stroke="#5b765e"/>':'<path d="m32 5 18 11v22L32 49 14 38V16Z" fill="#40546a" stroke="#cad8e4" stroke-width="1.5"/><path d="m32 12 12 8v14l-12 8-12-8V20Z" fill="#aebfcc"/><path d="m25 27 5 5 10-11" fill="none" stroke="#3d5367" stroke-width="3"/><path d="m17 40 12 8-9 15-4-9-9 1Zm30 0-12 8 9 15 4-9 9 1Z" fill="#909ab5" stroke="#c8cfdf"/>';
  return `<svg class="vc-art vc-earned-art${mini?' vc-mini':''}" data-vc-object="${safe}" data-vc-kind="earned" data-vc-size="${mini?'mini':'detail'}" viewBox="${mini?'0 0 20 20':'0 0 64 68'}" aria-hidden="true">${mini?`<g fill="${profile?'#bfd4bd':'#c3cfdf'}" fill-rule="evenodd">${compact}</g>`:full}</svg>`;
 }
 function render(id,mini=false){
  if(id==='profile-authored'||id==='reviewed-contribution')return earned(id,mini);
  const safe=Object.hasOwn(materials,id)?id:'unknown',[kind,light,dark]=materials[safe],key='vc-object-'+(++serial);
  if(mini)return `<svg class="vc-art vc-mini" data-vc-object="${safe}" data-vc-kind="${safe.startsWith('gift-')?'gift':'decoration'}" data-vc-size="mini" viewBox="0 0 20 20" aria-hidden="true"><path d="${miniPaths[safe]}" fill="${light}" fill-rule="evenodd" stroke-linejoin="round"/>${safe==='gift-cassette'?'<circle cx="6" cy="8.5" r="1.5" fill="#4e6175"/><circle cx="14" cy="8.5" r="1.5" fill="#4e6175"/>':''}${safe==='angel'?'<ellipse cx="10" cy="1.6" rx="2.4" ry=".8" fill="none" stroke="#eff3ff" stroke-width="1"/>':''}</svg>`;
  const object=safe.startsWith('gift-')?gift(safe,key):`<g data-vc-material="${kind}"><path d="${paths[safe]}" fill="url(#${key}-shade)" fill-rule="evenodd" transform="translate(0 1.2)"/><path d="${paths[safe]}" fill="url(#${key}-surface)" fill-rule="evenodd" stroke="${light}" stroke-width=".65" stroke-linejoin="round"/>${(details[safe]||'').replaceAll('{light}',light).replaceAll('{dark}',dark)}</g>`;
  return `<svg class="vc-art" data-vc-object="${safe}" data-vc-kind="${safe.startsWith('gift-')?'gift':'decoration'}" data-vc-material="${kind}" data-vc-size="detail" viewBox="0 0 64 68" aria-hidden="true">${definitions(key,kind,light,dark)}<ellipse class="vc-contact-shadow" cx="32" cy="64" rx="21" ry="2" fill="#000" opacity=".3"/>${object}</svg>`;
 }
 window.VoidCollectibleArt=Object.freeze({render,earned});
})();
