(() => {
'use strict';
const STORE='voidline.local.v1', $=id=>document.getElementById(id);
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>window.crypto?.randomUUID?.()||'v-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
const icon=(id,cls='')=>`<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const clone=v=>JSON.parse(JSON.stringify(v));
  const baseServers = {
    afterhours: {name:'Afterhours', icon:'A', description:'Good company. Questionable sleep schedules.', channels:[['general','The room where everything happens.'],['introductions','Find your people. Start with a hello.'],['the-feed','Things worth sending to the group chat.'],['night-bus','A sample zine, a small loop, and the roughs behind them.'],['larp-lounge','Commit to the bit. Respect the lore.'],['announcements','The latest from the Afterhours crew.']]},
    arcade: {name:'The Arcade', icon:'✧', description:'One more round. You know the drill.', channels:[['general','The lobby is always open.'],['looking-for-group','Find a party for your next adventure.'],['high-scores','Small wins. Big screenshots.'],['announcements','Updates from the arcade.']]},
    studio: {name:'Studio 404', icon:'▧', description:'A home for unfinished masterpieces.', channels:[['general','A little creative chaos.'],['work-in-progress','Show the rough edges.'],['inspiration','The things that make you make things.'],['announcements','Notes from the studio.']]}
  };
  const people = {
    nova: {name:'nova', avatar:'N', color:'purple', status:'collecting side quests', badge:'larp'},
    ghost: {name:'ghost.wav', avatar:'G', color:'mint', status:'a little off the grid', badge:'founder'},
    pixel: {name:'pixel', avatar:'P', color:'pink', status:'rendering a new personality', badge:'night'},
    orbit: {name:'orbit', avatar:'O', color:'blue', status:'somewhere in the void', badge:''},
    moss: {name:'moss', avatar:'M', color:'orange', status:'touching grass, allegedly', badge:'night'}
  };
function graphemes(value,limit){const text=String(value);return typeof Intl.Segmenter==='function'?Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text),part=>part.segment).slice(0,limit).join(''):Array.from(text).slice(0,limit).join('');}
const imageOK=v=>typeof v==='string'&&/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v)&&v.length<2900000;
const audioOK=v=>typeof v==='string'&&/^data:audio\/(webm|ogg|mp4)(;codecs=[a-z0-9,-]+)?;base64,[A-Za-z0-9+/=]+$/i.test(v)&&v.length<2900000;
function validContext(value){return typeof value==='string'&&/^[a-z0-9-]+\/[a-z0-9-]+$/.test(value);}
function bookmarkKey(context,messageId){return context+'::'+messageId;}
function normalize(raw={}) {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))raw={};
  const s={version:2,server:typeof raw.server==='string'?raw.server:'afterhours',channel:typeof raw.channel==='string'?raw.channel:'general',profile:{name:'you',avatar:'Y',badge:'larp',...((raw.profile&&typeof raw.profile==='object')?raw.profile:{})},messages:{},customServers:[],conversations:[],friends:[],savedMessages:{},favoriteContexts:{},contextFilters:{},artifacts:{},settings:{compact:false,motion:true,memberSidebar:true},lastRead:{},notifications:[],deleted:[],createdAt:Number(raw.createdAt)||Date.now()};
  if(window.VoidProfiles?.clean)Object.assign(s.profile,window.VoidProfiles.clean(s.profile));
  s.profile.name=graphemes(s.profile.name||'you',24);s.profile.avatar=graphemes(s.profile.avatar||'Y',3);
  if(raw.messages&&typeof raw.messages==='object')Object.entries(raw.messages).forEach(([k,list])=>{
    if(!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(k)||!Array.isArray(list))return;
    s.messages[k]=list.filter(m=>m&&typeof m.id==='string'&&typeof m.text==='string').map(m=>({id:m.id.slice(0,100),author:m.author==='system'?'system':Object.hasOwn(people,m.author)?m.author:'self',text:m.text.slice(0,4000),time:Number.isFinite(m.time)&&Math.abs(m.time)<8640000000000000?m.time:Date.now(),updatedAt:Number(m.updatedAt)||Number(m.time)||0,pinned:!!m.pinned,image:imageOK(m.image)?m.image:'',audio:audioOK(m.audio)?m.audio:'',replyTo:typeof m.replyTo==='string'?m.replyTo.slice(0,100):'',threadRoot:typeof m.threadRoot==='string'?m.threadRoot.slice(0,100):'',edited:!!m.edited,contributionId:window.VoidCommunity?.work(m.contributionId)?m.contributionId:'',reactions:Array.isArray(m.reactions)?m.reactions.filter(r=>r&&['🔥','✦','💜','😂','👀','👍','🌙'].includes(r.emoji)).map(r=>({emoji:r.emoji,count:Math.max(0,Math.min(999,Number(r.count)||0)),mine:!!r.mine})):[]}));
  });
  if(Array.isArray(raw.customServers))s.customServers=raw.customServers.filter(x=>x&&/^custom-[a-z0-9-]+$/.test(x.id)&&typeof x.name==='string'&&x.name.trim()).map(x=>({id:x.id,name:x.name.trim().slice(0,32),description:String(x.description||'Your own corner of the void.').slice(0,160),owner:x.owner!==false,category:['Art & design','Music','Gaming','Technology','Culture'].includes(x.category)?x.category:'Culture',accent:/^#[\da-f]{6}$/i.test(x.accent||'')?x.accent:'#9198b8',channels:Array.isArray(x.channels)&&x.channels.length?x.channels.filter(c=>Array.isArray(c)&&/^[a-z0-9-]{1,32}$/.test(c[0])).map(c=>[c[0],String(c[1]||'').slice(0,160)]):[['general','Your space. Your conversation.'],['announcements','News for your community.']]}));
  if(Array.isArray(raw.conversations))s.conversations=raw.conversations.filter(x=>x&&/^(dm|group)-[a-z0-9-]+$/.test(x.id)&&typeof x.name==='string').map(x=>({id:x.id,name:x.name.slice(0,32),members:Array.isArray(x.members)?x.members.filter(id=>Object.hasOwn(people,id)):[],group:!!x.group}));
  s.friends=Array.isArray(raw.friends)?raw.friends.filter(id=>Object.hasOwn(people,id)):[];
  if(raw.savedMessages&&typeof raw.savedMessages==='object'&&!Array.isArray(raw.savedMessages))Object.values(raw.savedMessages).forEach(record=>{
    if(!record||!validContext(record.context)||typeof record.messageId!=='string'||!record.messageId)return;
    const messageId=record.messageId.slice(0,100);
    s.savedMessages[bookmarkKey(record.context,messageId)]={context:record.context,messageId,savedAt:Number.isFinite(record.savedAt)&&Math.abs(record.savedAt)<8640000000000000?record.savedAt:0};
  });
  if(raw.favoriteContexts&&typeof raw.favoriteContexts==='object'&&!Array.isArray(raw.favoriteContexts))Object.entries(raw.favoriteContexts).forEach(([context,value])=>{if(validContext(context)&&value===true)s.favoriteContexts[context]=true;});
  if(raw.contextFilters&&typeof raw.contextFilters==='object'&&!Array.isArray(raw.contextFilters))Object.entries(raw.contextFilters).forEach(([space,value])=>{if(/^[a-z0-9-]+$/.test(space)&&['all','unread','favorites'].includes(value))s.contextFilters[space]=value;});

  s.readingPositions=raw.readingPositions&&typeof raw.readingPositions==='object'?raw.readingPositions:{};
  s.artifactInspected=Array.isArray(raw.artifactInspected)?raw.artifactInspected.filter(id=>typeof id==='string').slice(0,20):[];
  s.artifactSchema=Number(raw.artifactSchema)||0;
  s.artifacts=raw.artifacts&&typeof raw.artifacts==='object'&&!Array.isArray(raw.artifacts)?raw.artifacts:{};
  if(raw.profile&&!s.artifacts[s.profile.badge]&&['larp','founder','night'].includes(s.profile.badge))s.artifacts[s.profile.badge]=raw.version===2?{earnedAt:Date.now()}:{earnedAt:null,legacy:true};
  if(raw.settings&&typeof raw.settings==='object')s.settings={...s.settings,...raw.settings};
  s.settings.compact=!!s.settings.compact;s.settings.motion=s.settings.motion!==false;s.settings.memberSidebar=s.settings.memberSidebar!==false;
  if(raw.lastRead&&typeof raw.lastRead==='object')Object.entries(raw.lastRead).forEach(([k,v])=>{if(typeof v==='number')s.lastRead[k]=v;});
  if(Array.isArray(raw.deleted))s.deleted=raw.deleted.filter(x=>typeof x==='string').slice(-2000);
  if(Array.isArray(raw.notifications))s.notifications=raw.notifications.filter(n=>n&&typeof n.text==='string').slice(-80).map(n=>({id:String(n.id||uid()),text:n.text.slice(0,240),time:Number(n.time)||Date.now(),read:!!n.read,action:typeof n.action==='string'?n.action:'',artifact:typeof n.artifact==='string'?n.artifact:'',context:validContext(n.context)?n.context:''}));
  for(const [bucket,list]of Object.entries(s.messages)){
    const [space,channel]=bucket.split('/');
    if(space.startsWith('custom-')){let community=s.customServers.find(item=>item.id===space);if(!community){community={id:space,name:'Recovered community',description:'Recovered from existing message history.',owner:true,category:'Culture',accent:'#9198b8',channels:[]};s.customServers.push(community);}if(!community.channels.some(([id])=>id===channel))community.channels.push([channel,'Recovered channel']);}
    if(space==='direct'&&channel!=='notes'&&!s.conversations.some(item=>item.id===channel))s.conversations.push({id:channel,name:'Recovered conversation',members:[],group:false});
    const ids=new Set(list.map(m=>m.id)),missing=new Map();for(const message of list)if(message.threadRoot&&!ids.has(message.threadRoot))missing.set(message.threadRoot,Math.min(missing.get(message.threadRoot)||Infinity,message.time));
    for(const [id,time]of missing)list.push({id,author:'system',text:'Parent message unavailable in the older archive. Its retained replies are preserved in this recovered thread.',time:time-1,updatedAt:time-1,pinned:false,image:'',audio:'',replyTo:'',threadRoot:'',reactions:[]});
    list.sort((a,b)=>a.time-b.time);
  }
  return s;
}
const durable=window.VoidStore?.create(localStorage,STORE);
let raw={},rawText='';try{rawText=localStorage.getItem(STORE)||'';raw=durable?durable.load():JSON.parse(rawText||'{}');}catch(_){}
let tabStorage;try{tabStorage=sessionStorage;}catch(_){}
const tabJournal=window.VoidDrafts?.create(tabStorage),tabSnapshot=tabJournal?.load()||{};
const state=normalize(raw);if(tabSnapshot.location){state.server=tabSnapshot.location.server;state.channel=tabSnapshot.location.channel;}state.readingPositions=tabSnapshot.reading||{};
let sessionIssue=false;
let committed=clone(state);const failedMutations=[],failedMessageIds=new Map();
function replaceState(next){const location={server:state.server,channel:state.channel,readingPositions:state.readingPositions};Object.keys(state).forEach(k=>delete state[k]);Object.assign(state,normalize(next),location);ensureContext();}
function saveStatus(){let n=$('save-status');if(!n){n=document.createElement('section');n.id='save-status';n.setAttribute('role','status');(document.querySelector('.conversation')||document.body).prepend(n);}n.hidden=!failedMutations.length&&!sessionIssue;n.innerHTML=sessionIssue?`<strong>This tab’s latest draft is not stored.</strong><span>Keep the tab open, retry, or export recovery before refreshing.</span><button data-action="retry-save">Retry</button><button data-action="recover-save">Export recovery</button>`:failedMutations.length?`<strong>${failedMutations.length} change(s) need saving.</strong><span>Your content is recoverable in this session.</span><button data-action="retry-save">Retry</button><button data-action="recover-save">Export recovery</button>`:'';}
function retrySaves(){saveTab();const previousArtifacts=new Set(Object.keys(state.artifacts||{}));while(failedMutations.length){const item=failedMutations[0];const result=durable.retry(item.patch);if(!result.ok){toast('Storage is still unavailable. Export recovery before closing this tab.');break;}replaceState(result.state);committed=clone(state);failedMutations.shift();}saveStatus();renderAll();const recovered=Object.keys(state.artifacts||{}).filter(id=>!previousArtifacts.has(id));window.VoidBadges?.revealCommitted?.(recovered);for(const id of recovered){const record=window.VoidBadges?.catalog?.find(badge=>badge.id===id);if(record)window.dispatchEvent(new CustomEvent('voidline:artifact-earned',{detail:{id,name:record.name}}));}if(!failedMutations.length&&!sessionIssue){toast('Recovered changes are now saved. Your draft is kept for review.');}}
let priorFocus,toastTimer,threadId='',replyId='',pendingImage='',pendingAudio='',pendingName='',installPrompt=null,recorder=null,recordStream=null,recordTimer=null,recordChunks=[],recordRequest=0,recordPending=false,activeThreadKey='';
let modalReturn=null,readTimer,localDrawer='',drawerReturn=null,threadReturn=null;
const drafts=new Map(Object.entries(tabSnapshot.drafts||{})),threadDrafts=new Map(Object.entries(tabSnapshot.threads||{})),reading=new Map(Object.entries(tabSnapshot.reading||{})),historyLimits=new Map(),threadLimits=new Map();
function tabData(){return {location:{server:state.server,channel:state.channel},drafts:Object.fromEntries(drafts),threads:Object.fromEntries(threadDrafts),reading:Object.fromEntries(reading),thread:threadId};}
function saveTab(){const saved=tabJournal?.save(tabData())===true;const previous=sessionIssue;sessionIssue=!saved;const label=$('draft-status');if(label)label.textContent=sessionIssue?'Draft needs recovery before refresh':(drafts.get(key())?.text||drafts.get(key())?.image||drafts.get(key())?.audio)?'Draft saved in this tab':'Your words stay on this device.';if(sessionIssue||previous)saveStatus();return saved;}
const key=()=>`${state.server}/${state.channel}`;
const allServers=()=>({...baseServers,...Object.fromEntries(state.customServers.map(s=>[s.id,s]))});
const server=()=>state.server==='direct'?{name:'Your frequency',description:'Conversations, kept close.',channels:state.conversations.map(c=>[c.id,c.name])}:allServers()[state.server];
const direct=()=>state.server==='direct';
const currentConversation=()=>state.conversations.find(c=>c.id===state.channel);
function person(id) {
 if(id==='system')return{name:'Archive recovery',avatar:'VL',color:'blue',status:'offline',statusText:'Recovered context',badge:''};
 if(id==='self')return {...state.profile,color:'purple',status:state.profile.status||'online',statusText:state.profile.statusText||'In my own orbit',bio:state.profile.bio||'',id:'self'};
 const p=people[id];if(!p)return person('self');
 if(window.VoidCommunity?.residents?.[id])return {...p,...window.VoidCommunity.residents[id],id};
 return {...p,statusText:p.status,status:({nova:'online',ghost:'idle',pixel:'busy',orbit:'online',moss:'offline'})[id],bio:({nova:'Building a quieter corner of the internet. Collector of signals, stories, and unfinished ideas.',ghost:'Ambient records. Lost websites. A healthy appreciation for silence.',pixel:'Making things after midnight. Sometimes they even work.',orbit:'Moving at my own frequency. Currently somewhere between tabs.',moss:'A soft spot for the strange and the handmade.'})[id],id};
}
const canModerate=()=>!direct()&&!!state.customServers.find(s=>s.id===state.server&&s.owner);
const readOnly=()=>!direct()&&state.channel==='announcements'&&!canModerate();
function ensureContext(){if(state.server==='direct'){if(state.channel!=='notes'&&!state.conversations.some(c=>c.id===state.channel))state.channel='notes';}else{if(!Object.hasOwn(allServers(),state.server))state.server='afterhours';if(!server().channels.some(([id])=>id===state.channel))state.channel=server().channels[0]?.[0]||'general';}if(!Array.isArray(state.messages[key()]))state.messages[key()]=[];}
function toast(text){const n=$('toast');if(!n)return;n.textContent=text;n.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.classList.remove('show'),3600);}
function mergeMessages(other){const tombstones=new Set([...state.deleted,...other.deleted]);state.deleted=[...tombstones].slice(-2000);Object.entries(other.messages).forEach(([k,list])=>{const merged=new Map((state.messages[k]||[]).map(m=>[m.id,m]));list.forEach(m=>{const own=merged.get(m.id);if(!own||(m.updatedAt||m.time)>(own.updatedAt||own.time))merged.set(m.id,m);});state.messages[k]=[...merged.values()].filter(m=>!tombstones.has(m.id)).sort((a,b)=>a.time-b.time);});Object.keys(state.messages).forEach(k=>state.messages[k]=state.messages[k].filter(m=>!tombstones.has(m.id)));}
function persist(){
 const intended=clone(state);
 const result=durable?durable.commit(state):{ok:false,error:'Journal unavailable',patch:[]};
 if(result.ok){replaceState(result.state);committed=clone(state);return true;}
 if(result.patch?.length){const signature=JSON.stringify(result.patch.map(p=>p.path));const index=failedMutations.findIndex(item=>item.signature===signature);const item={signature,patch:result.patch,candidate:intended,time:Date.now()};if(index>=0)failedMutations[index]=item;else failedMutations.push(item);}
 replaceState(committed);saveStatus();toast('Not saved. Your content is retained. Retry or export recovery before closing this tab.');return false;
}
function notify(text,action='',artifact=''){state.notifications.push({id:uid(),text,time:Date.now(),read:false,action,artifact,context:key()});state.notifications=state.notifications.slice(-80);if(persist())updateNotificationCount();}
function updateNotificationCount(){const c=Object.entries(state.messages).reduce((count,[context,list])=>count+list.filter(message=>message.author!=='self'&&message.author!=='system'&&message.time>(state.lastRead[context]||0)).length,0)+state.notifications.filter(n=>!n.read).length,n=$('notification-count');if(n){n.textContent=c>99?'99+':c||'';n.hidden=!c;n.setAttribute('aria-label',c+' unread local inbox items');}}
function localPanelState(){
 const mobile=window.matchMedia('(max-width:760px)').matches,wide=window.matchMedia('(min-width:1051px)').matches;
 const conversation=document.querySelector('.conversation'),rail=document.querySelector('.server-rail'),sidebar=document.querySelector('.channel-sidebar'),members=document.querySelector('.members-sidebar');
 if(conversation){conversation.inert=!!localDrawer;for(const child of conversation.children||[])if(child.id!=='thread-panel')child.inert=mobile&&!!threadId;}
 if(rail)rail.inert=localDrawer==='members'||(mobile&&localDrawer!=='nav');
 if(sidebar)sidebar.inert=localDrawer==='members'||(mobile&&localDrawer!=='nav');
 if(members)members.inert=localDrawer==='nav'||(!wide&&localDrawer!=='members')||(wide&&(state.settings.memberSidebar===false||!!threadId));
 document.querySelectorAll('[data-action="menu"]').forEach(button=>button.setAttribute('aria-expanded',String(localDrawer==='nav')));
 document.querySelectorAll('[data-action="members"]').forEach(button=>button.setAttribute('aria-expanded',String(wide?state.settings.memberSidebar!==false:localDrawer==='members')));
}
function focusableReturn(node){return node?.isConnected&&!node.closest('[inert],[hidden]')&&(!node.getClientRects||node.getClientRects().length>0);}
function closeLocalDrawers(restore=true){
 const had=!!localDrawer,previous=drawerReturn;localDrawer='';drawerReturn=null;document.body.classList.remove('mobile-nav','members-open');localPanelState();
 if(had&&restore){if(focusableReturn(previous))previous.focus({preventScroll:true});else (threadId?$('thread-input'):$('message-input'))?.focus({preventScroll:true});}if(had)scheduleRead();return had;
}
function drawerFocusables(){
 const panels=localDrawer==='nav'?[document.querySelector('.server-rail'),document.querySelector('.channel-sidebar')]:localDrawer==='members'?[document.querySelector('.members-sidebar')]:threadId&&window.matchMedia('(max-width:760px)').matches?[$('thread-panel')]:[];
 return panels.flatMap(panel=>Array.from(panel?.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex="0"]')||[])).filter(node=>!node.hidden&&!node.closest('[hidden],[inert]'));
}
function toggleLocalDrawer(which,button){
 if(window.VoidEntrance?.isPlaying?.())return;if(localDrawer===which)return closeLocalDrawers();closeLocalDrawers(false);
 localDrawer=which;drawerReturn=button||document.activeElement;document.body.classList.add(which==='nav'?'mobile-nav':'members-open');localPanelState();drawerFocusables()[0]?.focus({preventScroll:true});
}
function resizeLocalPanels(){
 if((localDrawer==='nav'&&!window.matchMedia('(max-width:760px)').matches)||(localDrawer==='members'&&window.matchMedia('(min-width:1051px)').matches))closeLocalDrawers();else localPanelState();scheduleRead();
}
function modal(content,options={}){closeLocalDrawers();if(recordPending||recorder?.state==='recording')stopRecording(true);const d=$('app-modal');if(!d.open)priorFocus=document.activeElement;$('modal-content').innerHTML=content;d.className=options.wide?'modal-wide':'';if(options.className)d.classList.add(...options.className.split(/\s+/).filter(Boolean));const heading=$('modal-content').querySelector('h1,h2');if(heading){heading.id='current-modal-title';d.setAttribute('aria-labelledby',heading.id);}else d.removeAttribute('aria-labelledby');if(!d.open)d.showModal();requestAnimationFrame(()=>{$('modal-content').querySelector('[autofocus]')?.focus();});}
function closeModal(){stopRecording(true);$('app-modal').close();priorFocus?.focus?.();scheduleRead();}
function format(text){let h=esc(text);h=h.replace(/`([^`\n]+)`/g,'<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*\n]+)\*/g,'<em>$1</em>').replace(/~~([^~\n]+)~~/g,'<s>$1</s>');h=h.replace(/(https?:\/\/[^\s<&]+)/g,u=>`<a href="${u}" rel="noopener noreferrer" target="_blank">${u}</a>`);h=h.replace(/(^|\s)(@[a-zA-Z0-9_.-]+)/g,'$1<span class="mention">$2</span>');return h.replace(/\n/g,'<br>');}
function getStats(){const communityMessages=Object.entries(state.messages).filter(([k])=>!k.startsWith('direct/'));const own=communityMessages.flatMap(([,l])=>l).filter(m=>m.author==='self');return{ownMessages:own.length,channelsUsed:communityMessages.filter(([,l])=>l.some(m=>m.author==='self')).length,attachments:own.filter(m=>m.image).length,replies:own.filter(m=>m.threadRoot).length,pins:own.filter(m=>m.pinned).length,customServers:state.customServers.filter(s=>s.owner).length,customChannels:Math.max(0,...state.customServers.filter(s=>s.owner).map(s=>Math.max(0,s.channels.length-2))),profileComplete:!!window.VoidProfiles?.isComplete?.(),friends:state.friends.length};}
function progress(){window.VoidBadges?.checkUnlocks({announce:true});}
  function seed() {
    const now = Date.now();
    const msg=(author,text,minutes,reactions=[],extra={})=>({id:uid(),author,text,time:now-minutes*60000,reactions:reactions.map(([emoji,count])=>({emoji,count,mine:false})),...extra});
    const seeds={
      'afterhours/general':[
        msg('nova','the internet feels a little smaller in here. i like it.',34,[['💜',8],['✦',3]],{pinned:true}),
        msg('ghost','a corner of the internet with no algorithm? extremely suspicious. i’m staying.',31,[['😂',5]]),
        msg('pixel','just claimed LARP Pro Max. my imaginary credentials have never looked better.',27,[['🔥',6],['👀',2]]),
        msg('orbit','is “professional lurker” a valid introduction or do i have to develop a personality',23,[['😂',4]]),
        msg('nova','lurking is an art form. you’re among friends.',21,[['💜',5]]),
        msg('moss','tonight’s agenda: share something good, overthink a playlist, stay up too late 🌙',16,[['🌙',4],['👍',2]],{pinned:true})
      ],
      'afterhours/introductions':[msg('nova','name, current obsession, and one wildly unnecessary fun fact. go.',70,[['💜',3]],{pinned:true}),msg('ghost','ghost. collecting obscure ambient records. i have strong opinions about loading screens.',64),msg('pixel','pixel / making things / can identify a font from across the room. unfortunately.',58,[['😂',3]])],
      'afterhours/the-feed':[msg('moss','a reminder to save the thing you made, drink some water, and send that song to your friend.',52,[['💜',4]]),msg('orbit','current mood: a 3am drive in a city i’ve never visited.',37,[['🌙',2]])],
      'afterhours/larp-lounge':[msg('pixel','the council has assembled. first order of business: better badges.',45,[['✦',4]]),msg('nova','motion passed. everyone gets a dramatic title and absolutely no actual responsibilities.',38,[['😂',5]])],
      'afterhours/announcements':[msg('nova','Welcome to VOIDLINE. This is a local-first demo: sample conversations set the scene, and anything you post stays in this browser. Choose a badge, make yourself at home, and build your corner of the void.',180,[['💜',12]],{pinned:true})],
      'arcade/general':[msg('orbit','lobby’s open. what are we playing tonight?',28,[['👀',2]]),msg('moss','something cooperative. my competitive era lasted exactly nine minutes.',20,[['😂',3]])],
      'studio/general':[msg('pixel','show us something you made, even if it’s unfinished. especially if it’s unfinished.',46,[['💜',4]],{pinned:true}),msg('ghost','today’s progress: renamed final_final_v3 to actually_final_v4.',33,[['😂',6]])]
    };
    const supplied=window.VoidCommunity?.conversations||{};for(const [bucket,templates]of Object.entries(supplied))seeds[bucket]=templates.map(t=>msg(t.author,t.text,t.minutesAgo,[],{pinned:!!t.pinned,contributionId:t.contributionId||''}));
    if(supplied['afterhours/general'])seeds['afterhours/night-bus']=supplied['afterhours/general'].map(t=>msg(t.author,t.text,t.minutesAgo,[],{pinned:!!t.pinned,contributionId:t.contributionId||''}));
    Object.entries(seeds).forEach(([k,messages])=>{if(!Object.hasOwn(state.messages,k))state.messages[k]=messages.map((m,i)=>({...m,id:'seed-'+k.replace('/','-')+'-'+i}));});
  }
const art=id=>window.VoidBadges?.art(id)||'';
const mini=id=>window.VoidBadges?.mini(id)||'';
function avatar(id,extra=''){const p=person(id),self=id==='self';return `<button class="avatar avatar-${esc(p.color||'purple')} ${self?'self-custom-avatar':''} ${esc(extra)}" data-person="${esc(id)}" aria-label="View ${esc(p.name)}’s profile"${self?' style="--profile-accent:'+esc(state.profile.accent||'#a9a6d9')+'"':''}>${!self&&window.VoidCommunity?.avatarMarkup(id)?window.VoidCommunity.avatarMarkup(id):`<span class="avatar-initials">${esc(p.avatar)}</span>`}${p.avatarImage?`<img class="avatar-image" src="${esc(p.avatarImage)}" alt="" style="object-position:${Number(p.avatarX??50)}% ${Number(p.avatarY??50)}%">`:''}<i class="status-dot status-${esc(p.status)}"></i></button>`;}
function restoreNavigationFocus(container,focused){
 if(!focused)return;
 const match=Array.from(container.querySelectorAll('button')).find(button=>
  (focused.channel&&button.dataset.channel===focused.channel)||
  (focused.server&&button.dataset.server===focused.server)||
  (focused.contextFilter&&button.dataset.contextFilter===focused.contextFilter)||
  (focused.action&&button.dataset.action===focused.action&&(!focused.context||button.dataset.context===focused.context)));
 (match||container.querySelector('[data-context-filter][aria-pressed="true"]'))?.focus({preventScroll:true});
}
function renderServers() {
 const rail=$('server-list'),active=document.activeElement,focused=rail.contains?.(active)?{server:active.dataset.server}:null;
 $('server-list').innerHTML=Object.entries(allServers()).map(([id,s],i)=>`<button class="server-icon ${i<3?['afterhours','arcade','studio'][i]:'custom-server'}${id===state.server?' is-active':''}" data-server="${esc(id)}" aria-label="${esc(s.name)}" aria-pressed="${id===state.server}" title="${esc(s.name)}"><span>${i===0?icon('portal'):i===1?icon('game'):i===2?'<b class="studio-letter">S.</b>':esc(s.name[0].toUpperCase())}</span>${unreadServer(id)?'<i class="server-notification"></i>':''}</button>`).join('');
 document.querySelector('.server-home')?.classList.toggle('is-active',direct());
 $('server-name').textContent=server().name;
 const about=$('server-description');if(about)about.textContent=server().description||'Your own corner of the void.';
 $('sidebar-brand').classList.toggle('direct-brand',direct());
 $('sidebar-brand-title').innerHTML=direct()?'YOUR<br><em>frequency.</em>':state.server==='afterhours'?'AFTER<br><em>hours.</em>':`<em>${esc(server().name)}</em>`;
 $('sidebar-edition').textContent=direct()?'CONVERSATIONS / ON THIS DEVICE':canModerate()?'YOUR COMMUNITY / OWNER':state.server==='afterhours'?'A PLACE BETWEEN DAYS / EST. 2026':'COMMUNITY PREVIEW / EXPLORE';
 $('community-role').textContent=direct()?'Your private notebook':canModerate()?'OWNER · LOCAL COMMUNITY':'SAMPLE COMMUNITY';
 $('invite-button-label').textContent=direct()?'New conversation':canModerate()?'Manage community':'Explore communities';
 const count=$('online-count');if(count)count.textContent=String(direct()?state.conversations.length:6);
 restoreNavigationFocus(rail,focused);
}
function unreadServer(id){return Object.entries(state.messages).filter(([k])=>k.startsWith(id+'/')).reduce((n,[k,l])=>n+l.filter(m=>m.author!=='self'&&m.time>(state.lastRead[k]||0)).length,0);}
function unreadChannel(k){return(state.messages[k]||[]).filter(m=>m.author!=='self'&&!m.threadRoot&&m.time>(state.lastRead[k]||0)).length;}
function getContextEntries(space=state.server,filter=state.contextFilters[space]||'all'){
 const entries=space==='direct'?
  [{id:'notes',name:'Saved signals',description:'Your private notebook'},...state.conversations.map(item=>({id:item.id,name:item.name,description:'Conversation with sample contacts',group:item.group,avatar:person(item.members[0]).avatar}))]:
  (allServers()[space]?.channels||[]).map(([id,description])=>({id,name:id,description}));
 return entries.map(entry=>({...entry,context:space+'/'+entry.id,server:space,unread:unreadChannel(space+'/'+entry.id),favorite:state.favoriteContexts[space+'/'+entry.id]===true}))
  .filter(entry=>filter==='unread'?entry.unread>0:filter==='favorites'?entry.favorite:true);
}
function toggleFavorite(context=key()){
 if(!validContext(context))return false;
 const [space]=context.split('/');
 if(!getContextEntries(space,'all').some(entry=>entry.context===context))return false;
 const favorited=state.favoriteContexts[context]!==true;
 if(favorited)state.favoriteContexts[context]=true;else delete state.favoriteContexts[context];
 if(!persist())return false;
 renderChannels();toast(favorited?'Added to your favorite channels.':'Removed from your favorite channels.');
 return favorited;
}
function setContextFilter(filter,space=state.server){
 if(!['all','unread','favorites'].includes(filter)||!/^[a-z0-9-]+$/.test(space))return false;
 state.contextFilters[space]=filter;if(!persist())return false;renderChannels();return true;
}
function contextFiltersHTML(){
 const selected=state.contextFilters[state.server]||'all';
 return '<div class="context-filters" role="group" aria-label="Filter '+(direct()?'conversations':'channels')+'">'+[['all','All'],['unread','Unread'],['favorites','Favorites']].map(([value,label])=>'<button type="button" class="context-filter'+(selected===value?' is-active':'')+'" data-context-filter="'+value+'" aria-pressed="'+(selected===value)+'">'+label+'</button>').join('')+'</div>';
}
function contextRowHTML(entry){
 const selected=entry.id===state.channel,hash=direct()?(entry.id==='notes'?icon('note'):'<span class="dm-avatar">'+esc(entry.group?'G':entry.avatar)+'</span>'):entry.id==='announcements'?icon('announce'):'#';
 return '<div class="context-row'+(selected?' is-active':'')+'"><button class="channel-button'+(selected?' active':'')+'" data-channel="'+esc(entry.id)+'" aria-current="'+(selected?'page':'false')+'"><span class="channel-hash">'+hash+'</span><span class="channel-label">'+esc(entry.name)+'</span>'+(entry.unread?'<span class="channel-unread" title="'+entry.unread+' unread messages">'+entry.unread+'</span>':'')+(entry.group?'<small>GROUP</small>':'')+'</button><button type="button" class="context-favorite'+(entry.favorite?' is-favorite':'')+'" data-action="favorite-channel" data-context="'+esc(entry.context)+'" aria-pressed="'+entry.favorite+'" aria-label="'+(entry.favorite?'Remove ':'Add ')+esc(entry.name)+(entry.favorite?' from favorites':' to favorites')+'" title="'+(entry.favorite?'Remove from favorites':'Add to favorites')+'">'+icon('star')+'</button></div>';
}
function contextEmptyHTML(){
 const filter=state.contextFilters[state.server]||'all';
 if(filter==='all')return '<div class="context-filter-empty"><strong>No conversations yet.</strong><p>Open a conversation with a sample contact, or keep a private note.</p></div>';
 return '<div class="context-filter-empty" role="status"><strong>'+(filter==='unread'?'You’re caught up here.':'No favorites here yet.')+'</strong><p>'+(filter==='unread'?'There are no unread messages in this space.':'Use a channel’s star to keep it in Favorites.')+'</p><button class="text-button" data-context-filter="all">Show all '+(direct()?'conversations':'channels')+'</button></div>';
}
function renderChannels(){
 const navigation=$('channel-list'),active=document.activeElement,focused=navigation.contains?.(active)?{channel:active.dataset.channel,action:active.dataset.action,context:active.dataset.context,contextFilter:active.dataset.contextFilter}:null;
 const entries=getContextEntries(),rows=entries.map(contextRowHTML).join('')||contextEmptyHTML();
 const saved='<button class="nav-utility saved-messages-link" data-action="saved-messages">'+icon('bookmark')+'<span>Saved messages</span><span class="saved-count">'+Object.keys(state.savedMessages).length+'</span></button>';
 if(direct()){
  navigation.innerHTML='<button class="nav-utility" data-action="friends">'+icon('users')+'Contacts <span>'+state.friends.length+'</span></button>'+saved+contextFiltersHTML()+'<div class="channel-section-label">CONVERSATIONS<button data-action="new-dm" aria-label="New conversation">+</button></div>'+rows+'<p class="sidebar-footnote">Conversations with sample contacts are saved on this device. No messages are sent to other people.</p>';
 }else{
  navigation.innerHTML=saved+contextFiltersHTML()+'<div class="channel-section-label"><button class="section-toggle" data-collapse="text" aria-expanded="'+!state.settings.collapseText+'">⌄ TEXT CHANNELS</button>'+(canModerate()?'<button data-action="add-channel" aria-label="Create channel">+</button>':'')+'</div><div class="channel-group'+(state.settings.collapseText?' collapsed':'')+'">'+rows+'</div><div class="channel-section-label voice-section-label"><button class="section-toggle" data-collapse="voice" aria-expanded="'+!state.settings.collapseVoice+'">⌄ VOICE STUDIO</button></div><div class="channel-group'+(state.settings.collapseVoice?' collapsed':'')+'"><button class="channel-button" data-action="voice"><span class="channel-hash">'+icon('volume')+'</span><span>midnight-radio</span><small class="device-tag">LOCAL</small></button><div class="voice-subline"><span class="voice-equalizer"><i></i><i></i><i></i></span>Record a voice note</div></div><div class="channel-section-label community-section-label">YOUR SPACE</div><button class="nav-utility" data-action="community">'+icon('shield')+'Community '+(canModerate()?'<span>OWNER</span>':'')+'</button>';
 }
 const title=direct()?(state.channel==='notes'?'saved-signals':currentConversation()?.name||'conversation'):state.channel;
 $('channel-title').textContent=title;$('channel-eyebrow').textContent=direct()?'YOUR FREQUENCY / DEVICE-LOCAL':server().name.toUpperCase()+' / TEXT CHANNEL';
 $('channel-description').textContent=direct()?'A conversation on this device':server().channels.find(([id])=>id===state.channel)?.[1]||'';
 $('message-input').placeholder=readOnly()?'Announcements · read only':'Message '+(direct()?'':'#')+title;$('message-input').disabled=readOnly();$('send-btn').disabled=readOnly();$('message-form').classList.toggle('read-only',readOnly());
 $('message-input').setAttribute('aria-label','Message '+title);
 $('channel-scope').innerHTML=direct()?icon('shield')+'<span>'+(state.channel==='notes'?'Your private notes. Only on this device.':'Sample contact · Messages are not delivered to another person.')+'</span>':'<span class="scope-dot"></span><span>AFTERHOURS CLIENT</span><span class="scope-divider"></span><span>Device-local edition</span><button data-action="live">Open shared rooms '+icon('live')+'</button>';
 const favorite=$('favorite-channel');if(favorite){const selected=state.favoriteContexts[key()]===true;favorite.dataset.context=key();favorite.setAttribute('aria-pressed',String(selected));favorite.setAttribute('aria-label',(selected?'Remove current channel from':'Add current channel to')+' favorites');favorite.title=selected?'Remove from favorites':'Add to favorites';favorite.classList.toggle('is-favorite',selected);}
 restoreNavigationFocus(navigation,focused);
}
function renderMembers(){
 $('member-list').innerHTML=`<div class="member-section-label">YOUR SIGNAL</div><div class="member-self">${avatar('self')}<button class="member-info" data-person="self"><span class="member-name">${esc(state.profile.name)}<span class="member-role">YOU</span></span><span class="member-status">${esc(person('self').statusText)}</span></button></div><div class="member-section-label sample-section">SAMPLE RESIDENTS <span>05</span></div>${Object.keys(people).map(id=>{const p=person(id);return `<div class="member">${avatar(id)}<button class="member-info" data-person="${id}"><span class="member-name">${esc(p.name)}${id==='nova'?'<span class="resident-founder">FOUNDER</span>':''}</span><span class="member-status">${esc(p.statusText)}</span></button><span class="member-insignia">${mini(p.badge)}</span></div>`;}).join('')}`;
 $('self-name').textContent=state.profile.name;$('self-status').textContent=person('self').statusText;
 $('self-avatar').innerHTML=`<span class="avatar-initials">${esc(state.profile.avatar)}</span>${state.profile.avatarImage?`<img class="avatar-image" alt="" src="${esc(state.profile.avatarImage)}" style="object-position:${Number(state.profile.avatarX??50)}% ${Number(state.profile.avatarY??50)}%">`:''}<i class="status-dot status-${esc(person('self').status)}"></i>`;
 $('self-avatar').style.setProperty('--profile-accent',state.profile.accent||'#a9a6d9');
 $('featured-art').innerHTML=art(state.profile.badge||'larp');$('featured-art-name').textContent=({larp:'LARP PRO MAX',founder:'THE ORIGINAL SIGNAL',night:'3:33 AM'})[state.profile.badge]||window.VoidBadges?.catalog?.find(b=>b.id===state.profile.badge)?.name||'YOUR EQUIPPED ARTIFACT';
 $('artifact-count').textContent=String(Object.keys(state.artifacts).length).padStart(2,'0');
}
let messageIndex=new Map(),replyCounts=new Map();
function indexChannel(){messageIndex=new Map((state.messages[key()]||[]).map(m=>[m.id,m]));replyCounts=new Map();for(const m of messageIndex.values())if(m.threadRoot)replyCounts.set(m.threadRoot,(replyCounts.get(m.threadRoot)||0)+1);}
function messageHTML(m,thread=false){const p=person(m.author),parent=m.replyTo&&messageIndex.get(m.replyTo);const replies=replyCounts.get(m.id)||0;return `<article class="message${m.author==='self'?' own-message':''}${m.pinned?' is-pinned':''}" data-message-id="${esc(m.id)}" tabindex="-1"><div class="message-avatar-wrap">${avatar(m.author)}</div><div class="message-main">${parent?`<button class="reply-quote" data-jump="${esc(parent.id)}">${icon('reply')}<b>${esc(person(parent.author).name)}</b> ${esc(parent.text.slice(0,76))}</button>`:''}<div class="message-meta"><button class="username" data-person="${esc(m.author)}">${esc(p.name)}</button>${mini(p.badge)}${m.author==='self'?'<span class="self-indicator">YOU</span>':''}<time class="timestamp" datetime="${new Date(m.time).toISOString()}">${esc(new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(m.time))}</time>${m.edited?'<span class="edited-tag">edited</span>':''}${m.pinned?`<span class="message-pin" title="Pinned">${icon('pin')}</span>`:''}</div><div class="message-text">${format(m.text)}</div>${m.contributionId?contributionMessage(m.contributionId):''}${m.image?`<button class="message-image-link" data-image="${esc(m.id)}"><img class="message-image" src="${m.image}" alt="Image shared by ${esc(p.name)}" loading="lazy"></button>`:''}${m.audio?`<audio class="message-audio" controls preload="metadata" src="${m.audio}" aria-label="Voice note from ${esc(p.name)}"></audio>`:''}<div class="reactions">${m.reactions.map(r=>`<button class="reaction${r.mine?' selected':''}" data-react="${esc(r.emoji)}" data-id="${esc(m.id)}" aria-label="${esc(r.emoji)} reaction, ${r.count}" aria-pressed="${r.mine}">${r.emoji}<span>${r.count}</span></button>`).join('')}<button class="reaction add-reaction" data-react="💜" data-id="${esc(m.id)}" aria-label="Add heart reaction">♡ +</button></div>${!thread&&replies?`<button class="thread-link" data-message-action="thread" data-id="${esc(m.id)}">${icon('thread')}<b>${replies} ${replies===1?'reply':'replies'}</b><span>Open thread ${icon('arrow')}</span></button>`:''}</div><div class="message-tools"><button data-message-action="reply" data-id="${esc(m.id)}" aria-label="Reply" title="Reply">${icon('reply')}</button><button data-message-action="thread" data-id="${esc(m.id)}" aria-label="Open thread" title="Open thread">${icon('thread')}</button><button data-message-action="menu" data-id="${esc(m.id)}" aria-label="Message options" title="Message options">${icon('more')}</button></div></article>`;}
function contributionMessage(id){const item=window.VoidCommunity?.work(id);return item?`<button class="vc-contribution-card vc-message-work" data-contribution="${esc(id)}"><span class="vc-contribution-thumbnail">${item.art()}</span><span class="vc-contribution-copy"><small>INCLUDED SAMPLE WORK</small><strong>${esc(item.title)}</strong><span>${esc(item.type)}</span><em>Open the rough ${icon('external')}</em></span></button>`:'';}
function openContribution(id){return window.VoidCommunity?.openContribution(id,{modal,closeModal,toast});}
function captureAnchor(container){if(!container.getBoundingClientRect)return null;const top=container.getBoundingClientRect().top;for(const row of container.querySelectorAll('[data-message-id]')){const rect=row.getBoundingClientRect();if(rect.bottom>top)return{row,offset:rect.top-top};}return null;}
function restoreAnchor(container,anchor){if(anchor?.row?.isConnected)container.scrollTop+=anchor.row.getBoundingClientRect().top-container.getBoundingClientRect().top-anchor.offset;}
function reconcile(container,html){
 const template=document.createElement('template');
 if(!template.content){container.innerHTML=html;return;}
 template.innerHTML=html;
 const existing=new Map(Array.from(container.children).map((node,index)=>[node.dataset.messageId||node.dataset.staticKey||'static-'+index,node]));
 let cursor=container.firstChild;
 for(const desired of Array.from(template.content.children)){
  const id=desired.dataset.messageId||desired.dataset.staticKey;
  let node=id&&existing.get(id);
  if(node){existing.delete(id);node.className=desired.className;if(node.outerHTML!==desired.outerHTML){
   if(!desired.dataset.messageId){node.replaceChildren(...desired.childNodes);}else{
   const focus=document.activeElement,react=focus?.dataset?.react;
   for(const selector of ['.message-avatar-wrap','.message-meta','.message-text','.reactions','.thread-link','.reply-quote','.message-tools','.vc-message-work']){
    const current=node.querySelector(selector),next=desired.querySelector(selector);
    if(current&&next){if(current.outerHTML!==next.outerHTML)current.replaceChildren(...next.childNodes);}
    else if(current)current.remove();else if(next){const main=node.querySelector('.message-main')||node;if(selector==='.reply-quote')main.prepend(next);else main.append(next);}
   }
   for(const selector of ['audio','.message-image-link']){const current=node.querySelector(selector),next=desired.querySelector(selector);if(current&&next){const src=current.getAttribute('src')||current.querySelector('img')?.getAttribute('src'),nextSrc=next.getAttribute('src')||next.querySelector('img')?.getAttribute('src');if(src!==nextSrc)current.replaceWith(next);}else if(current)current.remove();else if(next)(node.querySelector('.message-main')||node).append(next);}
   if(react)Array.from(node.querySelectorAll('[data-react]')).find(item=>item.dataset.react===react)?.focus({preventScroll:true});
   }
  }}else node=desired;
  if(node!==cursor)container.insertBefore(node,cursor);cursor=node.nextSibling;
 }
 for(const node of existing.values())node.remove();
}
function renderMessages(scroll=false){
 indexChannel();const feed=$('chat-feed'),oldScroll=feed.scrollTop,anchor=captureAnchor(feed),nearBottom=feed.scrollHeight-feed.clientHeight-feed.scrollTop<48;
 const all=state.messages[key()]||[],top=all.filter(m=>!m.threadRoot),limit=historyLimits.get(key())||100,list=top.slice(-limit);let lastDate='';
 document.querySelector('.conversation')?.classList.toggle('established-channel',top.length>=3);document.body.classList.toggle('conversation-established',top.length>=3);
 const welcome=direct()?`<div class="conversation-intro"><span class="eyebrow">KEPT CLOSE / DEVICE-LOCAL</span><h2>${state.channel==='notes'?'Save a little signal.':esc(currentConversation()?.name||'Your frequency.')}</h2><p>${state.channel==='notes'?'Ideas, links, midnight thoughts. A private space for whatever finds you.':'A local conversation with sample contacts. Your words stay on this device.'}</p></div>`:`<div class="channel-welcome"><div class="welcome-copy"><span class="eyebrow">YOU FOUND YOUR FREQUENCY</span><h2>${state.channel==='general'?'Good company.<br><em>Strange hours.</em>':'#'+esc(state.channel)}</h2><p>${state.channel==='general'?'Somewhere between the last tab and the first light.<br>Stay a little longer. You’re among your people.':esc(server().channels.find(c=>c[0]===state.channel)?.[1]||'A fresh frequency. Make it your own.')}</p><button data-action="badges">Explore the artifact archive <span>↗</span></button></div><div class="welcome-sculpture" aria-hidden="true"><div class="sculpture-ellipse e1"></div><div class="sculpture-ellipse e2"></div><div class="sculpture-ellipse e3"></div><div class="sculpture-core"></div><span>VL—02<br>AFTERHOURS</span></div><span class="welcome-coordinate">PRIVATE FREQUENCY / 00:00—∞</span></div>`;
 let unreadShown=false;
 const rows=list.map(m=>{const date=new Intl.DateTimeFormat(undefined,{month:'long',day:'numeric',year:'numeric'}).format(m.time);const divider=date!==lastDate?`<div class="day-divider" data-static-key="date-${date}"><span>${esc(date)}</span></div>`:'';lastDate=date;const unread=!unreadShown&&m.author!=='self'&&m.time>(state.lastRead[key()]||0);if(unread)unreadShown=true;return divider+(unread?'<div class="unread-divider" data-static-key="unread">UNREAD TRANSMISSIONS</div>':'')+messageHTML(m);}).join('');
 reconcile(feed,`<div data-static-key="intro">${welcome}</div>${top.length>list.length?'<button class="load-history" data-static-key="older" data-action="load-older">Load older messages ('+(top.length-list.length)+' retained)</button>':''}`+rows+(!top.length?'<div data-static-key="empty" class="empty-channel"><p>A quiet frequency. Leave the first message.</p></div>':''));
 feed.scrollTop=scroll||nearBottom?feed.scrollHeight:oldScroll;if(!scroll&&!nearBottom)restoreAnchor(feed,anchor);
 const button=$('jump-latest');if(button)button.hidden=scroll||nearBottom;
 if(threadId)renderThread(false);
}
function renderAll(scroll=false){ensureContext();document.body.classList.toggle('members-hidden',state.settings.memberSidebar===false);document.body.classList.toggle('compact',!!state.settings.compact);renderServers();renderChannels();renderMembers();renderMessages(scroll);updateNotificationCount();window.VoidProfiles?.applyAppearance();localPanelState();}
function draft(){drafts.set(key(),{text:$('message-input').value,image:pendingImage,audio:pendingAudio,name:pendingName,reply:replyId});saveTab();}
function restoreDraft(){const d=drafts.get(key())||{};$('message-input').value=d.text||'';if(d.attachmentMissing)toast('This draft’s attachment is missing from session storage. Reattach it before sending.');pendingImage=d.image||'';pendingAudio=d.audio||'';pendingName=d.name||'';replyId=d.reply||'';renderComposerContext();resizeInput();}
function renderComposerContext(){const m=(state.messages[key()]||[]).find(x=>x.id===replyId);$('composer-context').innerHTML=`${m?`<div class="replying-bar">${icon('reply')}<span>Replying to <b>${esc(person(m.author).name)}</b></span><button data-action="cancel-reply" aria-label="Cancel reply">×</button></div>`:''}${pendingImage||pendingAudio?`<div class="attachment-chip">${icon(pendingAudio?'mic':'image')}<span>${esc(pendingName||'Voice note')}</span><button data-action="remove-attachment" aria-label="Remove attachment">×</button></div>`:''}`;}
function resizeInput(){const n=$('message-input');n.style.height='auto';n.style.height=Math.min(n.scrollHeight,130)+'px';}
function changeContext(s,c){const fromDrawer=closeLocalDrawers(false);draft();reading.set(key(),{top:$('chat-feed').scrollTop,limit:historyLimits.get(key())||100});state.readingPositions=state.readingPositions||{};state.readingPositions[key()]=reading.get(key());closeThread(false);state.server=s;state.channel=c;threadId='';$('thread-panel').hidden=true;document.body.classList.remove('mobile-nav','thread-open');ensureContext();renderAll(false);const position=reading.get(key())||state.readingPositions?.[key()];if(position){historyLimits.set(key(),position.limit);renderMessages();$('chat-feed').scrollTop=position.top;}else if((state.messages[key()]||[]).filter(m=>!m.threadRoot).length>5)$('chat-feed').scrollTop=$('chat-feed').scrollHeight;restoreDraft();saveTab();scheduleRead();document.querySelector('.conversation')?.classList.remove('channel-enter');requestAnimationFrame(()=>document.querySelector('.conversation')?.classList.add('channel-enter'));if(fromDrawer)(readOnly()?$('chat-feed'):$('message-input'))?.focus({preventScroll:true});}
function sendMessage(event){
 event?.preventDefault();if(readOnly())return toast('This channel is read only.');
 const input=$('message-input'),text=input.value.trim().slice(0,4000);if(!text&&!pendingImage&&!pendingAudio)return false;
 const context=key();if(!state.messages[context])state.messages[context]=[];const id=failedMessageIds.get(context)||uid();failedMessageIds.set(context,id);
 const message={id,author:'self',text,time:Date.now(),updatedAt:Date.now(),reactions:[],pinned:false,image:pendingImage,audio:pendingAudio,replyTo:replyId,threadRoot:''};
 state.messages[context]=state.messages[context].filter(m=>m.id!==id);state.messages[context].push(message);
 if(!persist()){$('message-announcer').textContent='Message not saved. Your draft and attachments are retained.';return false;}
 failedMutations.splice(0,failedMutations.length,...failedMutations.filter(item=>!item.patch.some(p=>p.path.includes(id))));saveStatus();failedMessageIds.delete(context);
 input.value='';pendingImage='';pendingAudio='';pendingName='';replyId='';drafts.delete(context);saveTab();renderComposerContext();resizeInput();renderMessages(true);progress();input.focus();$('message-announcer').textContent='Message saved on this device.';return state.messages[context].find(m=>m.id===id);
}
function jump(id){
 const message=state.messages[key()]?.find(m=>m.id===id);if(!message)return;
 let container=$('chat-feed');
 if(message.threadRoot){threadId=message.threadRoot;const replies=state.messages[key()].filter(m=>m.threadRoot===threadId);threadLimits.set(key()+':'+threadId,replies.length);renderThread(false);container=$('thread-feed');}
 else{const messages=state.messages[key()].filter(m=>!m.threadRoot);historyLimits.set(key(),Math.max(100,messages.length-messages.findIndex(m=>m.id===id)));renderMessages();}
 const target=Array.from(container.querySelectorAll('[data-message-id]')).find(n=>n.dataset.messageId===id);
 if(target){target.scrollIntoView({block:'center',behavior:window.VoidMotion?.enabled()?'smooth':'auto'});target.classList.add('search-highlight');target.focus({preventScroll:true});setTimeout(()=>target.classList.remove('search-highlight'),2400);}
}
function renderThread(scroll=true){
 indexChannel();const list=state.messages[key()]||[],root=list.find(m=>m.id===threadId);if(!root){closeThread();return;}
 const panel=$('thread-panel'),requested=key()+':'+threadId;
 const same=activeThreadKey===requested;
 if(activeThreadKey&&!same)threadDrafts.set(activeThreadKey,$('thread-input')?.value||'');
 const prior=same?$('thread-input')?.value||'':threadDrafts.get(requested)||'';
 if(!same){if(!activeThreadKey)threadReturn=document.activeElement;panel.innerHTML=`<header class="thread-heading"><span>${icon('thread')}Thread <small>#${esc(state.channel)}</small></span><button class="icon-button" data-action="close-thread" aria-label="Close thread">×</button></header><div id="thread-feed" class="thread-feed"></div><form id="thread-form" class="thread-composer"><label class="sr-only" for="thread-input">Reply in thread</label><textarea id="thread-input" placeholder="Reply in thread…" maxlength="4000" rows="2"${readOnly()?' disabled':''}>${esc(prior)}</textarea><button class="primary-button"${readOnly()?' disabled':''}>Send reply ${icon('arrow')}</button></form>`;}
 activeThreadKey=requested;panel.hidden=false;document.body.classList.add('thread-open');localPanelState();
 const feed=$('thread-feed'),position=feed.scrollTop,anchor=captureAnchor(feed),replies=list.filter(m=>m.threadRoot===threadId),limit=threadLimits.get(requested)||100,shown=replies.slice(-limit);
 reconcile(feed,messageHTML(root,true)+(replies.length>shown.length?'<button data-static-key="older-replies" class="load-history" data-action="load-thread-older">Load older replies ('+(replies.length-shown.length)+' retained)</button>':'')+'<div data-static-key="thread-divider" class="thread-divider">THE CONVERSATION CONTINUES</div>'+shown.map(m=>messageHTML(m,true)).join(''));
 feed.scrollTop=scroll?feed.scrollHeight:position;if(!scroll)restoreAnchor(feed,anchor);saveTab();
}
function closeThread(restore=true){const wasOpen=!!activeThreadKey,previous=threadReturn;threadReturn=null;if(activeThreadKey)threadDrafts.set(activeThreadKey,$('thread-input')?.value||'');activeThreadKey='';threadId='';$('thread-panel').hidden=true;document.body.classList.remove('thread-open');localPanelState();saveTab();if(wasOpen&&restore){if(focusableReturn(previous))previous.focus({preventScroll:true});else (threadId?$('thread-input'):$('message-input'))?.focus({preventScroll:true});}}
function sendThread(event){
 event.preventDefault();if(readOnly())return false;const input=$('thread-input'),text=input.value.trim();if(!text)return false;
 const context=key()+':'+threadId,id=failedMessageIds.get(context)||uid();failedMessageIds.set(context,id);
 state.messages[key()]=state.messages[key()].filter(m=>m.id!==id);state.messages[key()].push({id,author:'self',text:text.slice(0,4000),time:Date.now(),updatedAt:Date.now(),reactions:[],pinned:false,image:'',audio:'',replyTo:'',threadRoot:threadId});
 if(!persist())return false;failedMutations.splice(0,failedMutations.length,...failedMutations.filter(item=>!item.patch.some(p=>p.path.includes(id))));saveStatus();failedMessageIds.delete(context);input.value='';threadDrafts.delete(context);saveTab();renderMessages();renderThread(true);progress();$('thread-input').focus();return true;
}
function messageAction(action,id,target){if(action==='bookmark')return toggleBookmark(id);const m=state.messages[key()].find(m=>m.id===id);if(!m)return;const own=m.author==='self';if(action==='reply'){if(readOnly())return toast('This channel is read only.');replyId=m.id;renderComposerContext();$('message-input').focus();}if(action==='thread'){threadId=m.threadRoot||m.id;renderThread();$('thread-input')?.focus();}if(action==='pin'){if(!own&&!canModerate())return toast('Only the author or community owner can change this pin.');m.pinned=!m.pinned;m.updatedAt=Date.now();if(!persist()){renderMessages();return;}renderMessages();progress();toast(m.pinned?'Transmission pinned.':'Pin removed.');}if(action==='edit'&&own){modal(`<span class="eyebrow">REFINE YOUR TRANSMISSION</span><h2 class="modal-heading">Edit message</h2><form id="edit-message-form" data-id="${esc(m.id)}"><label class="sr-only" for="edit-text">Message</label><textarea class="text-field" id="edit-text" name="text" rows="5" maxlength="4000" required autofocus>${esc(m.text)}</textarea><div class="modal-actions"><button class="primary-button">Save changes</button><button type="button" class="secondary-button" data-action="close-modal">Cancel</button></div></form>`);}if(action==='delete'&&(own||canModerate()))modal(`<span class="eyebrow">YOUR ARCHIVE / YOUR CHOICE</span><h2 class="modal-heading">Delete this message?</h2><p class="modal-copy">This removes the message and its thread from this device’s archive.</p><div class="modal-actions"><button class="danger-button" data-confirm-delete="${esc(id)}">Delete message</button><button class="secondary-button" data-action="close-modal">Keep it</button></div>`);if(action==='menu')openMessageMenu(m,target);if(action==='copy')copyText(m.text);}
function openMessageMenu(m,target,x,y){
 const n=$('context-menu'),saved=Object.hasOwn(state.savedMessages,bookmarkKey(key(),m.id));
 const button=(action,label,symbol,extra='')=>'<button '+extra+' data-message-action="'+action+'" data-id="'+esc(m.id)+'">'+icon(symbol)+label+'</button>';
 n.innerHTML='<span class="context-label">TRANSMISSION OPTIONS</span>'+button('reply','Reply','reply')+button('thread','Open thread','thread')+button('bookmark',saved?'Remove from Saved':'Save message','bookmark')+button('copy','Copy text','copy')+(m.author==='self'||canModerate()?button('pin',m.pinned?'Unpin':'Pin transmission','pin'):'')+(m.author==='self'?button('edit','Edit message','edit'):'')+(m.author==='self'||canModerate()?button('delete','Delete message','trash','class="danger-text"'):'');
 n.hidden=false;const r=target?.getBoundingClientRect?.()||{left:x||0,bottom:y||0};n.style.left=Math.max(8,Math.min(x??r.left,window.innerWidth-225))+'px';n.style.top=Math.max(8,Math.min(y??r.bottom,window.innerHeight-n.offsetHeight-8))+'px';n.querySelector('button')?.focus();
}
function removeMessage(id){const message=state.messages[key()].find(m=>m.id===id);if(!message||(message.author!=='self'&&!canModerate()))return false;const ids=state.messages[key()].filter(m=>m.id===id||m.threadRoot===id).map(m=>m.id);state.deleted.push(...ids);state.messages[key()]=state.messages[key()].filter(m=>!ids.includes(m.id));if(!persist())return false;if(ids.includes(threadId))closeThread();closeModal();renderMessages();toast('Message removed from your archive.');}
function createLocalServer(name,description='',category='Culture'){const id='custom-'+uid().replace(/[^a-z0-9-]/g,'').toLowerCase();const s={id,name:name.trim().slice(0,32),description:description.trim().slice(0,160)||'A new frequency. Yours to define.',owner:true,category,accent:state.profile.accent||'#9198b8',channels:[['general','The beginning of your own community.'],['announcements','Official notes from the owner.']]};if(!s.name||state.customServers.length>=24)return false;state.customServers.push(s);if(!persist())return null;changeContext(id,'general');progress();notify(`${s.name} is ready. You have owner permissions.`,'community');return s;}
function addChannel(name,description=''){if(!canModerate())return false;const slug=name.toLowerCase().trim().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,32);if(!slug||server().channels.some(c=>c[0]===slug)||server().channels.length>=30)return false;server().channels.push([slug,description.slice(0,160)]);if(!persist())return null;changeContext(state.server,slug);progress();return slug;}
function showNewServer(){modal(`<span class="eyebrow">MAKE ROOM FOR YOUR PEOPLE</span><h2 class="modal-heading">Start a new frequency.</h2><p class="modal-copy">Your own community, with owner controls and a blank archive. Saved on this device.</p><form id="server-form"><label class="field-label" for="new-server-name">Community name</label><input id="new-server-name" class="text-field" name="name" maxlength="32" required placeholder="Something worth staying up for" autofocus><label class="field-label" for="new-server-description">What brings you together?</label><input id="new-server-description" class="text-field" name="description" maxlength="160" placeholder="A place for…"><label class="field-label" for="new-server-category">Your corner of culture</label><select id="new-server-category" class="text-field" name="category">${['Culture','Art & design','Music','Gaming','Technology'].map(c=>`<option>${c}</option>`).join('')}</select><div class="modal-actions"><button class="primary-button">Create community ${icon('arrow')}</button></div></form>`);}
function showNewChannel(){if(!canModerate())return toast('Channel creation is available in communities you own.');modal(`<span class="eyebrow">${esc(server().name)}</span><h2 class="modal-heading">Open a new channel.</h2><form id="channel-form"><label class="field-label" for="new-channel-name">Channel name</label><input id="new-channel-name" class="text-field" name="name" maxlength="32" pattern="[a-zA-Z0-9 -]+" required placeholder="late-night-ideas" autofocus><label class="field-label" for="new-channel-description">Topic</label><input id="new-channel-description" class="text-field" name="description" maxlength="160" placeholder="Give the conversation a direction"><div class="modal-actions"><button class="primary-button">Create channel ${icon('arrow')}</button></div></form>`);}
function showCommunity(){if(direct())return showFriends();const own=canModerate();modal(`<span class="eyebrow">COMMUNITY / ${own?'OWNER CONTROLS':'MEMBERSHIP'}</span><h2 class="modal-heading">${esc(server().name)}</h2><p class="modal-copy">${esc(server().description)}</p><div class="role-policy"><div><span class="role-swatch owner"></span><strong>Owner</strong><p>Creates channels, edits branding, publishes announcements, pins and moderates messages.</p></div><div><span class="role-swatch resident"></span><strong>Resident</strong><p>Posts in text channels, replies, reacts, and manages their own messages. Announcements stay read only.</p></div></div>${own?`<form id="community-form"><label class="field-label" for="community-name">Community name</label><input class="text-field" id="community-name" name="name" maxlength="32" value="${esc(server().name)}" required><label class="field-label" for="community-description">Description</label><textarea class="text-field" id="community-description" name="description" maxlength="160" rows="2">${esc(server().description)}</textarea><div class="modal-actions"><button class="primary-button">Save branding</button><button class="secondary-button" type="button" data-action="add-channel">Create channel</button></div></form>`:`<div class="sample-panel">This is a sample community. Your profile has resident permissions. Create a community to use the owner tools.</div><div class="modal-actions"><button class="primary-button" data-action="add-server">Create your community</button><button class="secondary-button" data-action="discovery">Discover more</button></div>`}`);}
const discoveryItems=[{id:'afterhours',name:'Afterhours',category:'Culture',code:'AH—001',copy:'For the beautifully over-online. The conversation after the conversation.',design:'orbital'},{id:'studio',name:'Studio 404',category:'Art & design',code:'ST—404',copy:'Unfinished masterpieces, experiments, and people who make things.',design:'grid'},{id:'arcade',name:'The Arcade',category:'Gaming',code:'AR—008',copy:'Co-op people in a competitive world. Find your next side quest.',design:'arcade'},{id:'low-frequency',name:'Low Frequency',category:'Music',code:'LF—033',copy:'Deep cuts, lost records, and playlists that understand you.',design:'waves'},{id:'soft-machines',name:'Soft Machines',category:'Technology',code:'SM—010',copy:'Creative code. Humane technology. Strange little inventions.',design:'grid'},{id:'no-signal',name:'No Signal Club',category:'Culture',code:'NS—000',copy:'A quiet corner for analog hobbies and things made by hand.',design:'orbital'}];
function showDiscovery(category='All'){modal(`<div class="discovery-header"><div><span class="eyebrow">THE DIRECTORY / FIND YOUR PEOPLE</span><h2 class="discovery-title">Somewhere,<br><em>you belong.</em></h2><p>Independent frequencies. Shared obsessions.<br>Explore the sample communities, or start your own.</p></div><div class="directory-sculpture" aria-hidden="true"><span></span><span></span><span></span><b>VL</b></div></div><div class="discovery-filters" role="group" aria-label="Filter communities">${['All','Culture','Art & design','Music','Gaming','Technology'].map(c=>`<button data-discover-category="${esc(c)}" class="${c===category?'active':''}">${esc(c)}</button>`).join('')}</div><div class="discovery-grid">${discoveryItems.filter(c=>category==='All'||c.category===category).map(c=>{const joined=Object.hasOwn(allServers(),c.id)||state.customServers.some(s=>s.id==='custom-discover-'+c.id);return `<article class="discovery-card"><div class="discovery-card-art design-${c.design}"><span class="discovery-code">${c.code}</span><span class="discovery-monogram">${esc(c.name[0])}</span><span class="discovery-card-category">${esc(c.category)}</span></div><div class="discovery-card-content"><h3>${esc(c.name)}</h3><p>${esc(c.copy)}</p><div><span>SAMPLE COMMUNITY</span><button class="secondary-button" data-discover-join="${c.id}">${joined?'Open':'Join locally'} ${icon('arrow')}</button></div></div></article>`;}).join('')}</div><div class="discovery-footer"><p>These communities are curated samples stored on this device. For conversations with other people, create or join an invite-only shared community.</p><button class="primary-button" data-action="live">Open shared rooms ${icon('live')}</button><button class="text-button" data-action="add-server">Create a local space</button></div>`,{wide:true,className:'directory-dialog'});}
function joinDiscovery(id){const item=discoveryItems.find(c=>c.id===id);if(!item)return;let target=Object.hasOwn(allServers(),id)?id:'custom-discover-'+id;if(!Object.hasOwn(allServers(),target)){if(state.customServers.length>=24)return toast('Your archive supports up to 24 local communities.');state.customServers.push({id:target,name:item.name,description:item.copy,owner:false,category:item.category,accent:'#8b97b4',channels:[['general','Your place in the conversation.'],['inspiration','Signals worth sharing.'],['announcements','Community notes.']]});notify(`You joined the local ${item.name} archive.`,'discovery');}closeModal();changeContext(target,'general');}
function dm(id){if(!Object.hasOwn(people,id))return;const conv='dm-'+id;if(!state.conversations.some(c=>c.id===conv))state.conversations.push({id:conv,name:people[id].name,members:[id],group:false});closeModal();changeContext('direct',conv);}
function toggleFriend(id){if(!Object.hasOwn(people,id))return;const i=state.friends.indexOf(id);if(i<0)state.friends.push(id);else state.friends.splice(i,1);if(!persist())return false;renderChannels();toast(i<0?`${people[id].name} added to your local contacts.`:'Contact removed.');return i<0;}
function showFriends(filter=''){const list=Object.keys(people).filter(id=>people[id].name.toLowerCase().includes(filter.toLowerCase()));modal(`<span class="eyebrow">PEOPLE / ON YOUR FREQUENCY</span><h2 class="modal-heading">Familiar signals.</h2><p class="modal-copy">Manage your local contacts and start a conversation. These profiles are sample residents.</p><label class="contact-search">${icon('search')}<input id="contact-search" class="text-field" placeholder="Find a person" value="${esc(filter)}" aria-label="Find a contact"></label><div id="contact-results">${contactsHTML(list)}</div><div class="modal-actions"><button class="secondary-button" data-action="new-dm">Create group conversation</button></div>`);}
function contactsHTML(list){return list.length?list.map(id=>`<div class="contact-row">${avatar(id)}<button class="contact-name" data-person="${id}"><strong>${esc(people[id].name)}</strong><span>${esc(people[id].status)}</span></button><button class="icon-button" data-dm="${id}" aria-label="Message ${esc(people[id].name)}">${icon('message')}</button><button class="secondary-button compact-button" data-contact="${id}">${state.friends.includes(id)?'Added ✓':'Add'}</button></div>`).join(''):'<div class="empty-state">No signals match that name.</div>';}
function showNewDM(){modal(`<span class="eyebrow">A SMALLER CIRCLE</span><h2 class="modal-heading">Start a conversation.</h2><p class="modal-copy">Select one contact for a direct conversation, or several for a group. This is a device-local archive.</p><form id="conversation-form"><label class="field-label" for="group-name">Group name (for multiple contacts)</label><input class="text-field" id="group-name" name="name" maxlength="32" placeholder="The afterparty"><div class="conversation-choices">${Object.keys(people).map(id=>`<label><input type="checkbox" name="members" value="${id}"><span class="avatar avatar-${person(id).color}">${esc(people[id].avatar)}</span><span>${esc(people[id].name)}</span></label>`).join('')}</div><div class="modal-actions"><button class="primary-button">Open conversation ${icon('arrow')}</button></div></form>`);}
function bookmarkedMessages(){
 return Object.entries(state.savedMessages).map(([id,record])=>({...record,id,message:(state.messages[record.context]||[]).find(message=>message.id===record.messageId)||null}))
  .sort((a,b)=>b.savedAt-a.savedAt||a.id.localeCompare(b.id));
}
function toggleBookmark(messageId,context=key()){
 const id=bookmarkKey(context,messageId),exists=Object.hasOwn(state.savedMessages,id);
 if(!exists&&(!validContext(context)||!(state.messages[context]||[]).some(message=>message.id===messageId)))return false;
 if(exists)delete state.savedMessages[id];else state.savedMessages[id]={context,messageId,savedAt:Date.now()};
 if(!persist())return false;
 renderChannels();renderMessages();toast(exists?'Removed from Saved messages.':'Saved privately on this device.');
 return !exists;
}
function removeBookmark(id){
 if(!Object.hasOwn(state.savedMessages,id))return false;
 delete state.savedMessages[id];if(!persist())return false;renderChannels();renderMessages();return true;
}
function sourceButtonHTML(context,message,classes='search-hit',query=''){
 const preview=message.text|| (message.image?'Image attachment':message.audio?'Voice note':'Shared work');
 return '<button class="'+classes+'" data-search-key="'+esc(context)+'" data-search-message="'+esc(message.id)+'"><span class="search-hit-location">'+esc(friendlyContext(context))+(message.threadRoot?' · Thread reply':'')+' · '+esc(new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(message.time))+'</span><strong>'+esc(person(message.author).name)+'</strong><p>'+matchSnippet(preview,query)+'</p><span class="source-link">Jump to message '+icon('arrow')+'</span></button>';
}
function openMessageSource(context,messageId){
 const message=state.messages[context]?.find(item=>item.id===messageId);
 if(!message){toast('The original message is no longer in this archive.');return false;}
 const [space,channel]=context.split('/');
 if(!getContextEntries(space,'all').some(entry=>entry.context===context)){
  modal('<span class="eyebrow">RETAINED IN YOUR ARCHIVE</span><h2 class="modal-heading">Archived message</h2><p class="modal-copy">'+esc(friendlyContext(context))+'</p><div class="message-text">'+format(message.text||'Media attachment')+'</div><p class="modal-footnote">This message is retained, but its original channel is no longer available.</p>');return true;
 }
 closeModal();changeContext(space,channel);jump(messageId);return true;
}
function showSavedMessages(){
 const entries=bookmarkedMessages();
 const rows=entries.map(entry=>'<article class="saved-message">'+(entry.message?sourceButtonHTML(entry.context,entry.message,'saved-message-source search-hit'):'<div class="saved-message-missing"><span class="search-hit-location">'+esc(friendlyContext(entry.context))+'</span><strong>Original message unavailable</strong><p>The source was removed from this archive. You can remove this bookmark.</p></div>')+'<div class="saved-message-actions"><span>'+ (entry.savedAt?'Saved '+esc(new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(entry.savedAt)):'Saved in your imported archive')+'</span><button class="text-button saved-remove" data-remove-bookmark="'+esc(entry.id)+'" aria-label="Remove saved message">Remove</button></div></article>').join('');
 modal('<span class="eyebrow">YOUR PERSONAL COLLECTION</span><h2 class="modal-heading">Saved messages</h2><p class="modal-copy">Keep something worth returning to. These bookmarks belong to your local profile and do not pin messages for a community.</p><div class="saved-summary" role="status">'+entries.length+' saved '+(entries.length===1?'message':'messages')+'</div><div class="saved-list">'+(rows||'<div class="empty-state"><h3>Nothing saved yet.</h3><p>Open a message’s options and choose <strong>Save message</strong>. Its source and thread stay one click away.</p></div>')+'</div><p class="modal-footnote">Saved on this device. Export your archive to take your bookmarks with you.</p>',{wide:true,className:'saved-dialog'});
}
let inboxView='unread';
function mentionsSelf(text){
 const aliases=[state.profile.name,'you','everyone','here'].map(value=>String(value||'').trim()).filter(Boolean);
 const escape=value=>Array.from(value).map(character=>'\\.^$*+?()[]{}|'.includes(character)?'\\'+character:character).join('');
 return new RegExp('(^|[^A-Za-z0-9_.-])@(?:'+aliases.map(escape).join('|')+')(?![A-Za-z0-9_.-])','i').test(text);
}
function inboxEntries(view='unread'){
 if(view==='activity')return state.notifications.map(notification=>({notification,read:notification.read,time:notification.time})).sort((a,b)=>b.time-a.time);
 return Object.entries(state.messages).flatMap(([context,list])=>list.filter(message=>message.author!=='self'&&message.author!=='system'&&(view==='mentions'?mentionsSelf(message.text):message.time>(state.lastRead[context]||0))).map(message=>({context,message,read:message.time<=(state.lastRead[context]||0),time:message.time}))).sort((a,b)=>b.time-a.time||b.message.id.localeCompare(a.message.id));
}
function markInboxRead(context,messageId=''){
 const list=state.messages[context];if(!validContext(context)||!Array.isArray(list))return false;
 const target=messageId?list.find(message=>message.id===messageId):null;if(messageId&&!target)return false;
 const through=target?target.time:Math.max(0,...list.map(message=>message.time));
 if(through<=(state.lastRead[context]||0))return true;
 state.lastRead[context]=through;if(!persist())return false;renderChannels();renderServers();updateNotificationCount();return true;
}
function markActivityRead(id=''){
 let changed=false;state.notifications.forEach(notification=>{if((!id||notification.id===id)&&!notification.read){notification.read=true;changed=true;}});
 if(changed&&!persist())return false;updateNotificationCount();return true;
}
function markAllInboxRead(view=inboxView){
 if(view==='activity')return markActivityRead();
 for(const entry of inboxEntries(view))state.lastRead[entry.context]=Math.max(state.lastRead[entry.context]||0,entry.message.time);
 if(!persist())return false;renderChannels();renderServers();updateNotificationCount();return true;
}
function openActivity(id){
 const entry=state.notifications.find(notification=>notification.id===id);if(!entry)return false;
 if(!markActivityRead(id))return false;
 closeModal();
 if(entry.context){const [space,channel]=entry.context.split('/');if(getContextEntries(space,'all').some(item=>item.context===entry.context))changeContext(space,channel);}
 if(entry.artifact)window.VoidBadges?.open(entry.artifact);else if(entry.action)handleAction(entry.action);
 return true;
}
function showNotifications(view='unread',focusTab=false){
 inboxView=['unread','mentions','activity'].includes(view)?view:'unread';
 const entries=inboxEntries(inboxView),unread=entries.filter(entry=>!entry.read).length;
 const tabs=[['unread','Unread'],['mentions','Mentions'],['activity','Activity']].map(([id,label])=>'<button class="inbox-tab'+(id===inboxView?' is-active':'')+'" id="inbox-tab-'+id+'" role="tab" aria-selected="'+(id===inboxView)+'" aria-controls="inbox-panel" tabindex="'+(id===inboxView?'0':'-1')+'" data-inbox-tab="'+id+'">'+label+'<span>'+inboxEntries(id).filter(entry=>!entry.read).length+'</span></button>').join('');
 const rows=entries.map(entry=>{
  if(entry.notification){const item=entry.notification;return '<article class="inbox-entry notification-item'+(entry.read?'':' unread')+'"><button class="inbox-entry-source" data-notification-open="'+esc(item.id)+'"><span class="notification-symbol">'+icon(item.artifact?'artifact':'inbox')+'</span><span><strong>'+esc(item.text)+'</strong><time>'+esc(new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(item.time))+'</time>'+(item.context?'<small>'+esc(friendlyContext(item.context))+'</small>':'')+'</span></button>'+(!entry.read?'<div class="inbox-entry-actions"><button class="text-button" data-notification-read="'+esc(item.id)+'">Mark read</button></div>':'')+'</article>';}
  return '<article class="inbox-entry'+(entry.read?'':' unread')+'">'+sourceButtonHTML(entry.context,entry.message,'inbox-entry-source search-hit')+'<div class="inbox-entry-actions"><span>'+(entry.read?'Read':'Unread')+'</span>'+(!entry.read?'<button class="text-button" data-inbox-read="'+esc(entry.context)+'" data-inbox-message="'+esc(entry.message.id)+'" title="Mark this message and earlier messages in this channel as read">Mark read</button>':'')+'</div></article>';
 }).join('');
 const empty=inboxView==='unread'?'<h3>You’re caught up.</h3><p>Unread messages from this device’s archive will appear here.</p>':inboxView==='mentions'?'<h3>No mentions yet.</h3><p>Messages mentioning @'+esc(state.profile.name)+(state.profile.name.toLowerCase()==='you'?'':' or @you')+' will appear here. Sample conversations do not generate live replies.</p>':'<h3>No activity yet.</h3><p>Your artifact milestones and local community changes will appear here.</p>';
 modal('<span class="eyebrow">YOUR LOCAL INBOX</span><h2 class="modal-heading">Pick up the thread.</h2><p class="modal-copy">Unread messages, mentions, and your activity across the archive on this device. Included residents and conversations are samples.</p><div class="inbox-tabs" role="tablist" aria-label="Inbox views">'+tabs+'</div><div class="inbox-toolbar"><span role="status">'+entries.length+' '+(entries.length===1?'item':'items')+' · '+unread+' unread</span>'+(unread?'<button class="text-button" data-action="inbox-mark-all">Mark all '+(inboxView==='activity'?'activity':'shown messages')+' read</button>':'')+'</div><section id="inbox-panel" role="tabpanel" aria-labelledby="inbox-tab-'+inboxView+'" class="inbox-list">'+(rows||'<div class="empty-state">'+empty+'</div>')+'</section>',{wide:true,className:'inbox-dialog'});
 if(focusTab)document.querySelector('[data-inbox-tab="'+inboxView+'"]')?.focus({preventScroll:true});
}
function friendlyContext(k){const [id,channel]=k.split('/');if(id==='direct')return channel==='notes'?'Saved signals':state.conversations.find(c=>c.id===channel)?.name||'Conversation';return (allServers()[id]?.name||'Archived community')+' / #'+channel;}
function matchSnippet(text,query){const index=text.toLowerCase().indexOf(query.toLowerCase()),start=Math.max(0,index-60),snippet=text.slice(start,start+220);const escaped=esc(snippet),needle=esc(query);if(!needle)return escaped;const at=escaped.toLowerCase().indexOf(needle.toLowerCase());return(start?'…':'')+(at<0?escaped:escaped.slice(0,at)+'<mark>'+escaped.slice(at,at+needle.length)+'</mark>'+escaped.slice(at+needle.length));}
let searchLimit=30;
function searchArchive(input){
 const filters={},phrase=String(input||'').replace(/(^|\s)(in|from|before|after|has):(\S+)/gi,(_,space,type,value)=>{filters[type.toLowerCase()]=value.toLowerCase();return ' ';}).trim(),query=phrase.toLowerCase();
 const result={query,filters,matches:[],people:[],communities:[],error:''},dates={};
 for(const name of ['before','after']){
  if(!filters[name])continue;
  const value=filters[name],time=/^\d{4}-\d{2}-\d{2}$/.test(value)?Date.parse(value+'T00:00:00Z'):NaN;
  if(!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==value){result.error='Use a real date in YYYY-MM-DD format for '+name+':, for example '+name+':2026-01-01.';return result;}
  dates[name]=time;
 }
 if(dates.before!==undefined&&dates.after!==undefined&&dates.after>=dates.before){result.error='The after: date must be earlier than the before: date.';return result;}
 if(filters.has&&!['image','audio'].includes(filters.has)){result.error='Use has:image or has:audio to filter attachments.';return result;}
 if(!query&&!Object.keys(filters).length)return result;
 if(filters.in)filters.in=filters.in.replace(/^#/,'');
 if(filters.from)filters.from=filters.from.replace(/^@/,'');
 Object.entries(state.messages).forEach(([context,list])=>list.forEach(message=>{
  const [space,channel]=context.split('/');
  if(filters.in&&channel!==filters.in&&space!==filters.in&&context!==filters.in)return;
  if(filters.from&&message.author!==filters.from&&person(message.author).name.toLowerCase()!==filters.from&&!(filters.from==='me'&&message.author==='self'))return;
  if(filters.has==='image'&&!message.image)return;
  if(filters.has==='audio'&&!message.audio)return;
  if(dates.before!==undefined&&message.time>=dates.before)return;
  if(dates.after!==undefined&&message.time<=dates.after)return;
  if(message.text.toLowerCase().includes(query))result.matches.push({k:context,m:message});
 }));
 result.matches.sort((a,b)=>b.m.time-a.m.time||b.m.id.localeCompare(a.m.id));
 if(query&&!Object.keys(filters).length){
  result.people=Object.keys(people).filter(id=>people[id].name.toLowerCase().includes(query));
  result.communities=Object.entries(allServers()).filter(([,community])=>community.name.toLowerCase().includes(query));
 }
 return result;
}
function searchResults(input,limit=30){
 const result=searchArchive(input);
 if(result.error)return '<div class="search-validation" role="alert"><strong>Check your search filter.</strong><p>'+esc(result.error)+'</p></div>';
 if(!result.query&&!Object.keys(result.filters).length)return '<div class="empty-state"><h3>Find it again.</h3><p>Search all messages, sample residents, and communities saved on this device.</p><p>Try <strong>in:night-bus</strong>, <strong>from:nova</strong>, or <strong>has:image</strong>.</p></div>';
 const shown=result.matches.slice(0,Math.max(30,Number(limit)||30));
 let html='<div class="search-summary" role="status" aria-live="polite" tabindex="-1">Showing '+shown.length+' of '+result.matches.length+' '+(result.matches.length===1?'message':'messages')+(result.people.length?' · '+result.people.length+' '+(result.people.length===1?'person':'people'):'')+(result.communities.length?' · '+result.communities.length+' '+(result.communities.length===1?'community':'communities'):'')+'</div>';
 html+=shown.map(({k,m})=>sourceButtonHTML(k,m,'search-hit',result.query)).join('');
 if(shown.length<result.matches.length)html+='<button id="search-load-more" class="secondary-button search-load-more" data-action="search-more">Load '+Math.min(30,result.matches.length-shown.length)+' more messages</button>';
 html+=result.people.map(id=>'<button class="search-person" data-person="'+esc(id)+'">'+icon('users')+'<span>'+esc(people[id].name)+'</span><small>PROFILE</small></button>').join('');
 html+=result.communities.map(([id,community])=>'<button class="search-person" data-navigate-server="'+esc(id)+'">'+icon('portal')+'<span>'+esc(community.name)+'</span><small>COMMUNITY</small></button>').join('');
 if(!result.matches.length&&!result.people.length&&!result.communities.length)html+='<div class="empty-state"><h3>No matches.</h3><p>Try another word or remove a filter. Search only includes this device’s archive.</p></div>';
 return html;
}
function showSearch(query=''){
 searchLimit=30;
 modal('<span class="eyebrow">SEARCH YOUR LOCAL ARCHIVE</span><h2 class="modal-heading">Follow a signal.</h2><label class="global-search-input">'+icon('search')+'<input id="global-search" class="text-field" placeholder="Search all messages, people, communities…" value="'+esc(query)+'" aria-label="Global search" autofocus></label><p class="search-filter-hint">Newest matches first · Filters: in:general from:nova has:image before:2026-01-01 after:2025-12-01. Dates use UTC.</p><div id="global-results" class="global-results">'+searchResults(query,searchLimit)+'</div>',{wide:true,className:'search-dialog'});
}
function loadMoreSearch(){
 const input=$('global-search');if(!input)return;searchLimit+=30;$('global-results').innerHTML=searchResults(input.value,searchLimit);
 (document.querySelector('#search-load-more')||document.querySelector('.search-summary'))?.focus({preventScroll:true});
}
const commands=[['live','Shared rooms · Invite your people','live'],['saved-messages','Saved messages','bookmark'],['inbox','Inbox · Unread, mentions & activity','inbox'],['discovery','Discover communities','globe'],['friends','Contacts & profiles','users'],['badges','Open the artifact archive','artifact'],['profile-view','Your profile','profile'],['appearance','Appearance & settings','settings'],['new-dm','New conversation','message'],['add-server','Create a community','plus'],['search','Search all transmissions','search'],['download','Download VOIDLINE','download'],['replay','Replay client entrance','portal']];
function commandResults(query=''){
 const q=query.trim().toLowerCase(),groups=[];let serial=0;
 const option=(body,attributes)=>`<button id="command-result-${serial}" role="option" aria-selected="${serial===0}" class="command-item${serial++===0?' selected':''}" ${attributes}>${body}</button>`;
 if(q){const residents=Object.keys(people).filter(id=>people[id].name.toLowerCase().includes(q));if(residents.length)groups.push(['People',residents.map(id=>option(`${icon('profile')}<span>${esc(people[id].name)}<small>Sample resident · View profile</small></span>${icon('arrow')}`,`data-person="${id}"`)).join('')]);}
 const channels=Object.entries(allServers()).flatMap(([id,community])=>community.channels.filter(([channel])=>(community.name+' '+channel).toLowerCase().includes(q)).slice(0,q?8:1).map(([channel])=>({server:id,channel,name:community.name}))).slice(0,8);
 if(channels.length)groups.push(['Channels',channels.map(item=>option(`<span class="command-hash">#</span><span>${esc(item.channel)}<small>${esc(item.name)}</small></span>${icon('arrow')}`,`data-navigate-server="${esc(item.server)}" data-navigate-channel="${esc(item.channel)}"`)).join('')]);
 if(q){const matches=Object.entries(state.messages).flatMap(([bucket,list])=>list.filter(message=>message.text.toLowerCase().includes(q)).map(message=>({bucket,message}))).sort((a,b)=>b.message.time-a.message.time).slice(0,6);if(matches.length)groups.push(['Messages',matches.map(({bucket,message})=>option(`${icon('message')}<span>${matchSnippet(message.text,q)}<small>${esc(person(message.author).name)} · ${esc(friendlyContext(bucket))}</small></span>${icon('arrow')}`,`data-search-key="${esc(bucket)}" data-search-message="${esc(message.id)}"`)).join('')]);}
 const actions=commands.filter(([,name])=>name.toLowerCase().includes(q));if(actions.length)groups.push(['Commands',actions.map(([action,name,symbol])=>option(`${icon(symbol)}<span>${esc(name)}</span>${icon('arrow')}`,`data-action="${action}"`)).join('')]);
 return groups.map(([name,results])=>`<div class="command-group" role="group" aria-label="${name}"><h3 class="command-group-label" aria-hidden="true">${name}</h3>${results}</div>`).join('')||'<div class="empty-state">No matching signals. Try a name, channel, message, or command.</div>';
}
function showCommands(){modal(`<div class="command-search">${icon('search')}<input id="command-input" role="combobox" aria-expanded="true" aria-controls="command-results" aria-autocomplete="list" aria-activedescendant="command-result-0" placeholder="Search people, channels, messages, commands" autocomplete="off" aria-label="Search people, channels, messages and commands" autofocus><kbd>ESC</kbd></div><div id="command-results" class="command-results" role="listbox" aria-label="Commands and channels">${commandResults()}</div><div class="command-footer"><span>↑↓ to navigate</span><span>↵ to open</span><b>VOIDLINE</b></div>`,{className:'command-dialog'});}
function showPins(){const list=state.messages[key()].filter(m=>m.pinned);modal(`<span class="eyebrow">#${esc(state.channel)} / SAVED TO THE WALL</span><h2 class="modal-heading">Pinned transmissions.</h2>${list.map(m=>`<button class="search-hit" data-jump-modal="${esc(m.id)}"><strong>${esc(person(m.author).name)}</strong><p>${esc(m.text||'Media attachment')}</p></button>`).join('')||'<div class="empty-state">Nothing pinned here yet.<br>Use a message’s options to pin your own transmission.</div>'}`);}
function showDownload(){const offline=document.documentElement.dataset.offline==='true';modal(`<span class="eyebrow">THE CLIENT / TAKE IT WITH YOU</span><h2 class="modal-heading">Your frequency.<br>Wherever you go.</h2><p class="modal-copy">The complete device-local client in a single file. Entrance, conversations, profiles, and artifact collection — all included.</p><a class="download-option" href="${offline?esc(location.href):'downloads/voidline-offline.html'}" download="VOIDLINE-AFTERHOURS.html"><span class="download-icon">${icon('download')}</span><span><strong>${offline?'Save an offline copy':'Download offline client'}</strong><small>Single HTML file · Desktop browsers · No install required</small></span>${icon('arrow')}</a>${!offline?'<a class="download-option" href="downloads/voidline-source.zip" download="VOIDLINE-source.zip"><span class="download-icon">'+icon('code')+'</span><span><strong>The source archive</strong><small>Client, Worker API, migrations & tests</small></span>'+icon('arrow')+'</a>':''}${installPrompt?'<button class="secondary-button install-button" data-action="install">Install web app on this device</button>':''}<div class="sample-panel">Your history belongs to this browser. Export your archive in settings to move it between copies. Shared rooms are available in the hosted app after sign-in. This download keeps its personal archive on this device; shared media and live calls are unavailable.</div><button class="text-button" data-action="export">Export my data before downloading ↗</button>`);}
function showHelp(){modal(`<span class="eyebrow">A PLACE BETWEEN DAYS</span><h2 class="modal-heading">Welcome to Afterhours.</h2><p class="modal-copy">An independent communication client with a device-local archive. The residents and communities supplied with the app are sample content. You can create communities, keep conversations, customize a profile, and earn artifacts through your own activity.</p><div class="help-shortcuts"><div><kbd>Ctrl / ⌘ K</kbd><span>Command palette</span></div><div><kbd>Ctrl / ⌘ ,</kbd><span>Appearance</span></div><div><kbd>Enter</kbd><span>Send a message</span></div><div><kbd>Shift + Enter</kbd><span>New line</span></div><div><kbd>Esc</kbd><span>Close a panel</span></div></div><p class="modal-footnote">Formatting: **bold**, *italic*, ~~strikethrough~~, and \`inline code\`. Image and voice attachments stay on this device. The client synchronizes saved messages between tabs in the same browser.</p><div class="modal-actions"><button class="primary-button" data-action="discovery">Find your frequency</button><button class="secondary-button" data-action="download">Get the client</button></div>`);}
function showNetwork(){modal(`<span class="eyebrow">CLIENT STATUS / TRANSPARENT BY DESIGN</span><h2 class="modal-heading">A private frequency.</h2><div class="client-status-grid"><div><span>Archive</span><strong>On this device</strong></div><div><span>Messaging server</span><strong>Not connected</strong></div><div><span>Open-tab updates</span><strong>Browser storage events</strong></div><div><span>IP lookup / tracking</span><strong>Not used</strong></div><div><span>Edition</span><strong>AFTERHOURS / 02</strong></div><div><span>Stored transmissions</span><strong>${Object.values(state.messages).flat().length}</strong></div></div><p class="modal-footnote">No fabricated connection metrics. The hosted page uses normal hosting and sign-in traffic; the offline client needs no network connection.</p><div class="modal-actions"><button class="secondary-button" data-action="export">Export your archive</button></div>`);}
async function copyText(text){try{await navigator.clipboard.writeText(text);toast('Copied to your clipboard.');}catch(_){modal(`<h2 class="modal-heading">Copy this signal.</h2><textarea class="text-field" rows="4" readonly autofocus>${esc(text)}</textarea><p class="modal-footnote">Select the text and use your browser’s Copy command.</p>`);}}
function exportRecovery(){downloadBlob(new Blob([JSON.stringify({format:'voidline-recovery',state,pending:failedMutations,legacyArchive:rawText,tabSession:tabData()},null,2)],{type:'application/json'}),'VOIDLINE-recovery.json');}
function exportData(){if(failedMutations.length||sessionIssue){exportRecovery();toast('Recovery archive exported, including unsaved changes.');return;}downloadBlob(new Blob([JSON.stringify({format:'voidline-afterhours',exportedAt:new Date().toISOString(),state},null,2)],{type:'application/json'}),'VOIDLINE-archive.json');toast('Your archive has been exported.');}
function downloadBlob(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
let pendingImport=null;
function prepareImport(data){
 const recoveredTab=data.format==='voidline-recovery'&&data.tabSession?window.VoidDrafts?.clean(data.tabSession):null;
 if(data.format==='voidline-recovery')data={format:'voidline-afterhours',state:window.VoidStore.recover(data)};
 if(data.format!=='voidline-afterhours'||!data.state||!data.state.messages||Number(data.state.version)>3)throw Error('Unsupported archive format or version.');
 for(const [bucket,list]of Object.entries(data.state.messages)){if(!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(bucket)||!Array.isArray(list)||list.some(m=>!m||typeof m.id!=='string'||typeof m.text!=='string'||(m.image&&!imageOK(m.image))||(m.audio&&!audioOK(m.audio))))throw Error('Import contains an invalid message or unsupported media. Nothing changed.');}
 if(data.state.profile?.avatarImage&&window.VoidProfiles?.validateAvatarImage&&!window.VoidProfiles.validateAvatarImage(data.state.profile.avatarImage))throw Error('Import contains an invalid avatar image. Nothing changed.');
 const incoming=normalize(data.state),candidate=clone(state);
 const deleted=new Set([...candidate.deleted,...incoming.deleted]);candidate.deleted=[...deleted];
 for(const [key,list]of Object.entries(incoming.messages)){const map=new Map((candidate.messages[key]||[]).map(m=>[m.id,m]));for(const message of list){const old=map.get(message.id);if(!old||(message.updatedAt||message.time)>(old.updatedAt||old.time))map.set(message.id,message);}candidate.messages[key]=[...map.values()].filter(m=>!deleted.has(m.id)).sort((a,b)=>a.time-b.time);}
 const communities=new Map(candidate.customServers.map(server=>[server.id,server]));
 for(const item of incoming.customServers){const old=communities.get(item.id);if(old){const channels=new Map(old.channels);item.channels.forEach(([id,description])=>channels.set(id,description));if(channels.size>Math.max(30,old.channels.length))throw Error('Import exceeds the channel capacity for '+old.name+'. Export it separately or create room first.');communities.set(item.id,{...old,...item,owner:old.owner||item.owner,channels:[...channels]});}else{if(item.channels.length>30)throw Error('Imported community exceeds 30 channels.');communities.set(item.id,item);}}
 if(communities.size>Math.max(24,state.customServers.length))throw Error('Import exceeds the 24-community capacity. Your current archive is unchanged.');candidate.customServers=[...communities.values()];
 const conversations=new Map(candidate.conversations.map(item=>[item.id,item]));incoming.conversations.forEach(item=>conversations.set(item.id,item));if(conversations.size>Math.max(40,state.conversations.length))throw Error('Import exceeds the 40-conversation capacity.');candidate.conversations=[...conversations.values()];
 const schemas={...baseServers,...Object.fromEntries(candidate.customServers.map(item=>[item.id,item]))};
 for(const bucket of Object.keys(incoming.messages)){const [community,channel]=bucket.split('/');if(community==='direct'){if(channel!=='notes'&&!conversations.has(channel))throw Error('Archive refers to a missing conversation.');}else if(!schemas[community]?.channels.some(([id])=>id===channel))throw Error('Archive refers to a missing community or channel: '+bucket);}
 for(const [id,record]of Object.entries(incoming.savedMessages))if(!candidate.savedMessages[id]||record.savedAt>candidate.savedMessages[id].savedAt)candidate.savedMessages[id]=record;
 candidate.favoriteContexts={...candidate.favoriteContexts,...incoming.favoriteContexts};candidate.contextFilters={...candidate.contextFilters,...incoming.contextFilters};
 candidate.profile={...candidate.profile,...incoming.profile};candidate.settings={...candidate.settings,...incoming.settings};candidate.artifacts={...candidate.artifacts,...incoming.artifacts};candidate.artifactInspected=[...new Set([...candidate.artifactInspected,...incoming.artifactInspected])];candidate.friends=[...new Set([...candidate.friends,...incoming.friends])];if(recoveredTab)Object.defineProperty(candidate,'tabRecovery',{value:recoveredTab,enumerable:false});return candidate;
}
function commitImport(){if(!pendingImport)return false;const candidate=pendingImport,recovery=candidate.tabRecovery;const replaceExisting=!!$('import-replace-drafts')?.checked;replaceState(candidate);if(!persist())return false;if(recovery){for(const [bucket,item]of Object.entries(recovery.drafts||{})){if(!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(bucket)||!item||typeof item!=='object')continue;const current=drafts.get(bucket);if(!replaceExisting&&current&&(current.text||current.image||current.audio))continue;drafts.set(bucket,{text:typeof item.text==='string'?item.text.slice(0,4000):'',image:imageOK(item.image)?item.image:'',audio:audioOK(item.audio)?item.audio:'',name:typeof item.name==='string'?item.name.slice(0,160):'',reply:typeof item.reply==='string'?item.reply.slice(0,100):''});}for(const [bucket,text]of Object.entries(recovery.threads||{})){if(typeof text==='string'&&bucket.length<220&&(replaceExisting||!threadDrafts.get(bucket)))threadDrafts.set(bucket,text.slice(0,4000));}restoreDraft();saveTab();}pendingImport=null;window.VoidProfiles?.applyAppearance();renderAll();closeModal();toast(sessionIssue?'Archive merged. Recovered drafts still need session storage; use Retry or recovery export.':'Archive merged and saved. Existing local history is retained.');progress();return true;}
function importData(){const picker=document.createElement('input');picker.type='file';picker.accept='.json,application/json';picker.onchange=async()=>{const file=picker.files?.[0];if(!file)return;if(file.size>20*1024*1024)return toast('Choose an archive smaller than 20 MB.');try{const data=JSON.parse(await file.text());pendingImport=prepareImport(data);modal(`<span class="eyebrow">IMPORT PREVIEW</span><h2 class="modal-heading">Merge your archive?</h2><p class="modal-copy">${pendingImport.customServers.length} local communities and ${Object.values(pendingImport.messages).flat().length} retained messages after merging. Messages with matching IDs use their newest edit. Imported identity and appearance preferences replace the current preferences. Your existing history remains.</p>${pendingImport.tabRecovery?'<p class="modal-copy">This recovery file includes tab-local drafts. They will restore by conversation without moving your active destination.</p><label class="recovery-draft-option"><input id="import-replace-drafts" type="checkbox">Replace this tab’s existing drafts where they conflict</label>':''}<div class="modal-actions"><button class="primary-button" data-action="commit-import">Merge and save</button><button class="secondary-button" data-action="close-modal">Cancel</button></div>`);}catch(error){pendingImport=null;toast(error.message==='Unexpected end of JSON input'?'That file could not be read. Your archive is unchanged.':String(error.message||'Invalid archive. Nothing changed.'));}};picker.click();}
function showVoice(){modal(`<span class="eyebrow">MIDNIGHT RADIO / VOICE STUDIO</span><h2 class="modal-heading">Leave a little of your voice.</h2><div class="voice-studio"><div class="voice-orb">${icon('mic')}</div><div class="voice-studio-lines" aria-hidden="true">${Array.from({length:24},(_,i)=>`<i style="--h:${12+(i*17)%46}px"></i>`).join('')}</div><span id="recording-state">YOUR MIC IS OFF</span><p>Record a private voice note for the current channel.<br>Up to 30 seconds. Saved on this device.</p></div><div class="modal-actions"><button class="primary-button" id="record-button" data-action="record-voice">${icon('mic')}Start recording</button><button class="secondary-button" data-action="close-modal">Cancel</button></div><p class="modal-footnote">Microphone access is requested only when you start. This client has no shared voice server or live calls.</p>`);}
async function recordVoice(){
 if(readOnly())return toast('Choose a writable channel before recording.');
 if(recorder?.state==='recording'){const b=$('record-button');if(b){b.disabled=true;b.textContent='Preparing your voice note…';}recorder.stop();return;}
 if(recordPending)return;
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return toast('Voice recording requires a supported browser on HTTPS or localhost.');
 const recordingKey=key(),request=++recordRequest;recordPending=true;
 const button=$('record-button');if(button){button.disabled=true;button.textContent='Waiting for microphone permission…';}
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:true});
  if(request!==recordRequest||!$('app-modal').open||!$('record-button')){stream.getTracks().forEach(t=>t.stop());return;}
  recordPending=false;recordStream=stream;const chunks=[];
  const type=['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
  recorder=new MediaRecorder(stream,type?{mimeType:type}:undefined);
  const currentRecorder=recorder;recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  recorder.onstop=()=>{
   clearTimeout(recordTimer);stream.getTracks().forEach(t=>t.stop());recordStream=null;
   if(request!==recordRequest)return;const blob=new Blob(chunks,{type:currentRecorder.mimeType});
   if(blob.size>2*1024*1024){showVoice();toast('That recording exceeds the 2 MB attachment limit. Try a shorter note.');return;}
   if(!blob.size){showVoice();toast('No audio was captured. You can try recording again.');return;}
   const reader=new FileReader();reader.onload=()=>{
    if(request!==recordRequest)return;
    if(!audioOK(reader.result)){showVoice();toast('This browser produced an unsupported audio format.');return;}
    if(recordingKey!==key()){const d=drafts.get(recordingKey)||{};d.audio=reader.result;d.name='Voice note';drafts.set(recordingKey,d);}
    else{pendingAudio=reader.result;pendingImage='';pendingName='Voice note';renderComposerContext();draft();}
    saveTab();closeModal();toast('Voice note ready. Press Send to save it to the channel.');
   };reader.onerror=()=>{if(request===recordRequest){showVoice();toast('The voice note could not be prepared. Try again.');}};reader.readAsDataURL(blob);
  };
  recorder.start();$('recording-state').textContent='RECORDING / MAX 30 SECONDS';$('record-button').disabled=false;$('record-button').innerHTML=icon('stop')+'Stop & attach';document.querySelector('.voice-studio')?.classList.add('is-recording');
  recordTimer=setTimeout(()=>{if(recorder?.state==='recording')recorder.stop();},30000);
 }catch(_){if(request===recordRequest){recordPending=false;recordStream?.getTracks().forEach(t=>t.stop());recordStream=null;const b=$('record-button');if(b){b.disabled=false;b.innerHTML=icon('mic')+'Try microphone again';}toast('Microphone access was unavailable. You can continue using text chat.');}}
}
function stopRecording(discard=false){recordRequest++;recordPending=false;if(recorder?.state==='recording'){if(discard)recorder.onstop=()=>{};recorder.stop();}clearTimeout(recordTimer);recordStream?.getTracks().forEach(t=>t.stop());recordStream=null;}
function attachImage(){if(readOnly())return toast('This channel is read only.');const attachmentKey=key(),picker=document.createElement('input');picker.type='file';picker.accept='image/png,image/jpeg,image/webp,image/gif';picker.onchange=()=>{const f=picker.files?.[0];if(!f)return;if(!['image/png','image/jpeg','image/webp','image/gif'].includes(f.type)||f.size>2*1024*1024)return toast('Choose a PNG, JPEG, WebP or GIF smaller than 2 MB.');const reader=new FileReader();reader.onload=()=>{if(!imageOK(reader.result))return toast('That image could not be attached.');if(attachmentKey!==key()){const d=drafts.get(attachmentKey)||{};d.image=reader.result;d.audio='';d.name=f.name;drafts.set(attachmentKey,d);}else{pendingImage=reader.result;pendingAudio='';pendingName=f.name;renderComposerContext();draft();$('message-input').focus();}saveTab();};reader.onerror=()=>toast('That file could not be read. Try another image.');reader.readAsDataURL(f);};picker.click();}
function emojiPicker(){modal(`<span class="eyebrow">A SMALL EXPRESSION</span><h2 class="modal-heading">Set the mood.</h2><div class="emoji-grid">${['💜','🔥','🌙','😂','👀','✦','👍','🫡','✨','🎮','🪩','👻','🖤','💭','🛸','☕'].map(e=>`<button data-emoji="${e}" aria-label="Insert ${e}">${e}</button>`).join('')}</div>`);}
function handleAction(action,button){const actions={
 'saved-messages':showSavedMessages,'favorite-channel':()=>toggleFavorite(button?.dataset?.context||key()),'inbox-mark-all':()=>{if(markAllInboxRead())showNotifications(inboxView,true);},'search-more':loadMoreSearch,
 'profile':()=>window.VoidProfiles.edit(),'profile-view':()=>window.VoidProfiles.open('self'),'appearance':()=>window.VoidProfiles.settings(),'badges':()=>window.VoidBadges.open(),'gift':()=>window.VoidBadges.open(),'discovery':()=>showDiscovery(),'friends':()=>showFriends(),'new-dm':showNewDM,'direct':()=>changeContext('direct','notes'),'command':showCommands,'search':()=>showSearch(),'inbox':showNotifications,'pinned':showPins,'download':showDownload,'load-older':()=>{const f=$('chat-feed'),height=f.scrollHeight;historyLimits.set(key(),(historyLimits.get(key())||100)+100);renderMessages();f.scrollTop+=f.scrollHeight-height;},'load-thread-older':()=>{const f=$('thread-feed'),height=f.scrollHeight;threadLimits.set(key()+':'+threadId,(threadLimits.get(key()+':'+threadId)||100)+100);renderThread(false);f.scrollTop+=f.scrollHeight-height;},'jump-latest':()=>{renderMessages(true);markReached();},'retry-save':retrySaves,'recover-save':exportRecovery,'help':showHelp,'network':showNetwork,'voice':showVoice,'record-voice':recordVoice,'add-server':showNewServer,'add-channel':showNewChannel,'community':showCommunity,'server-menu':showCommunity,'attachment':attachImage,'emoji':emojiPicker,'export':exportData,'import':importData,'commit-import':commitImport,
 'invite':()=>direct()?showNewDM():canModerate()?showCommunity():showDiscovery(),
 'members':()=>{if(window.matchMedia('(min-width:1051px)').matches){state.settings.memberSidebar=!state.settings.memberSidebar;persist();renderAll();}else toggleLocalDrawer('members',button);},
 'menu':()=>toggleLocalDrawer('nav',button),'close-thread':closeThread,'cancel-reply':()=>{replyId='';renderComposerContext();draft();},'remove-attachment':()=>{pendingImage='';pendingAudio='';pendingName='';renderComposerContext();draft();},'close-modal':()=>{stopRecording(true);closeModal();},
 'replay':()=>{closeModal();window.VoidEntrance.replay();},'mute':showVoice,'deafen':()=>window.VoidProfiles.settings(),
 'install':async()=>{if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;closeModal();}},
 'challenge':()=>{modal(`<span class="eyebrow">OPEN STUDIO / A CREATIVE PROMPT</span><h2 class="modal-heading">Make something<br>from the static.</h2><p class="modal-copy">A tiny creative challenge with no deadline: share an original image, sketch, photo, or piece of writing. Give it a title. Reply to the post with the story behind it.</p><div class="challenge-steps"><span>01 / MAKE A SIGNAL</span><span>02 / SHARE YOUR WORK</span><span>03 / TELL ITS STORY</span></div><p class="modal-footnote">Keep it in your own archive. This is a personal creative prompt, not a live event or public submission.</p><div class="modal-actions"><button class="primary-button" data-start-challenge>Open the studio ${icon('arrow')}</button></div>`);}
 };if(actions[action])actions[action]();}
function scheduleRead(){requestAnimationFrame(()=>markReached());}
function markReached(){
 if(document.hidden||document.body.classList.contains('vl-live-mode')||$('app-modal').open||document.body.classList.contains('mobile-nav')||document.body.classList.contains('members-open')||window.VoidEntrance?.isPlaying?.())return;
 const feed=$('chat-feed'),atBottom=feed.scrollHeight-feed.clientHeight-feed.scrollTop<48;let reached=state.lastRead[key()]||0;
 if(atBottom)reached=Math.max(reached,...(state.messages[key()]||[]).filter(m=>!m.threadRoot).map(m=>m.time));
 else if(feed.getBoundingClientRect){const bounds=feed.getBoundingClientRect();for(const row of feed.querySelectorAll('[data-message-id]')){const rect=row.getBoundingClientRect();if(rect.top>=bounds.top&&rect.bottom<=bounds.bottom){const message=state.messages[key()]?.find(m=>m.id===row.dataset.messageId);if(message)reached=Math.max(reached,message.time);}}}
 if(reached>(state.lastRead[key()]||0)){state.lastRead[key()]=reached;if(persist()){renderChannels();renderServers();updateNotificationCount();}}
 if($('jump-latest'))$('jump-latest').hidden=atBottom;
}
function boot(){
 const apple=/Mac|iPhone|iPad/.test(navigator.userAgentData?.platform||navigator.platform||'');document.querySelectorAll('.titlebar-command kbd').forEach(node=>node.textContent=apple?'⌘ K':'Ctrl K');
 seed();ensureContext();
 const api={state,esc,modal,closeModal,toast,persist,refresh:()=>renderAll(),getStats,person,openContribution,people:()=>people,dm,toggleFriend,isFriend:id=>state.friends.includes(id)};
 window.VoidBadges?.init(api);window.VoidProfiles?.init(api);
 if(rawText&&raw?.version!==2){try{if(!localStorage.getItem('voidline.backup.before-afterhours2'))localStorage.setItem('voidline.backup.before-afterhours2',rawText);}catch(_){}}
 if(!state.notifications.length&&!raw?.version)state.notifications.push({id:uid(),text:'Welcome to the Afterhours edition. Your original archive is right where you left it.',time:Date.now(),read:false,action:'help'});
 renderAll();restoreDraft();persist();const previous=state.readingPositions?.[key()];if(previous){historyLimits.set(key(),previous.limit||100);renderMessages();$('chat-feed').scrollTop=previous.top||0;}else $('chat-feed').scrollTop=(state.messages[key()]||[]).length>6?$('chat-feed').scrollHeight:0;
 saveTab();if(tabSnapshot.thread&&(state.messages[key()]||[]).some(message=>message.id===tabSnapshot.thread)){threadId=tabSnapshot.thread;renderThread(false);}scheduleRead();
 $('modal-close').addEventListener('click',()=>{stopRecording(true);closeModal();});
 $('app-modal').addEventListener('cancel',()=>stopRecording(true));
 $('app-modal').addEventListener('click',e=>{if(e.target===$('app-modal')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){stopRecording(true);closeModal();}}});
 $('message-form').addEventListener('submit',sendMessage);$('chat-feed').addEventListener('scroll',()=>{clearTimeout(readTimer);readTimer=setTimeout(markReached,180);});
 $('message-input').addEventListener('input',()=>{resizeInput();draft();});
 $('message-input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();sendMessage();}});
 $('search-input').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();showSearch(e.target.value);}});
 document.addEventListener('submit',e=>{
  const f=e.target,fd=()=>new FormData(f);
  if(f.id==='server-form'){e.preventDefault();const d=fd();const s=createLocalServer(String(d.get('name')||''),String(d.get('description')||''),String(d.get('category')||'Culture'));if(s){closeModal();toast('Your new community is ready.');}else if(s===false)toast('Choose a name. You can keep up to 24 local communities.');}
  if(f.id==='channel-form'){e.preventDefault();const d=fd(),c=addChannel(String(d.get('name')||''),String(d.get('description')||''));if(c){closeModal();toast('#'+c+' is ready.');}else if(c===false)toast('Use a unique channel name. Communities support up to 30 channels.');}
  if(f.id==='community-form'){e.preventDefault();if(!canModerate())return;const d=fd(),s=server();s.name=String(d.get('name')||s.name).trim().slice(0,32)||s.name;s.description=String(d.get('description')||'').slice(0,160);if(!persist())return;renderAll();closeModal();toast('Community identity updated.');}
  if(f.id==='thread-form')sendThread(e);
  if(f.id==='edit-message-form'){e.preventDefault();const m=state.messages[key()].find(m=>m.id===f.dataset.id);if(m?.author!=='self')return;const text=String(fd().get('text')||'').trim().slice(0,4000);if(!text)return;m.text=text;m.edited=true;m.updatedAt=Date.now();if(!persist())return;closeModal();renderMessages();toast('Message updated.');}
  if(f.id==='conversation-form'){e.preventDefault();const d=fd(),members=d.getAll('members').filter(id=>Object.hasOwn(people,id));if(!members.length)return toast('Choose at least one contact.');if(members.length===1)return dm(members[0]);if(state.conversations.length>=40)return toast('Your archive supports up to 40 conversations.');const c={id:'group-'+uid().replace(/[^a-z0-9-]/g,''),name:String(d.get('name')||'The afterparty').trim().slice(0,32)||'The afterparty',members,group:true};state.conversations.push(c);closeModal();changeContext('direct',c.id);}
 });
 document.addEventListener('input',e=>{if(e.target.id==='thread-input'&&activeThreadKey){threadDrafts.set(activeThreadKey,e.target.value);saveTab();}if(e.target.id==='global-search'){searchLimit=30;$('global-results').innerHTML=searchResults(e.target.value,searchLimit);}if(e.target.id==='command-input'){$('command-results').innerHTML=commandResults(e.target.value);const first=$('command-results').querySelector('button');if(first)e.target.setAttribute('aria-activedescendant',first.id);else e.target.removeAttribute('aria-activedescendant');}if(e.target.id==='contact-search')$('contact-results').innerHTML=contactsHTML(Object.keys(people).filter(id=>people[id].name.toLowerCase().includes(e.target.value.toLowerCase())));});
 document.addEventListener('click',async e=>{
  const b=e.target.closest('button,a,[data-action]');if(!e.target.closest('#context-menu'))$('context-menu').hidden=true;if(!b)return;
  if(b.dataset.server)return changeContext(b.dataset.server,'general');
  if(b.dataset.channel)return changeContext(state.server,b.dataset.channel);
  if(b.dataset.contextFilter)return setContextFilter(b.dataset.contextFilter);
  if(b.dataset.removeBookmark){if(removeBookmark(b.dataset.removeBookmark)){showSavedMessages();toast('Removed from Saved messages.');}return;}
  if(b.dataset.inboxTab)return showNotifications(b.dataset.inboxTab,true);
  if(b.dataset.inboxRead){if(markInboxRead(b.dataset.inboxRead,b.dataset.inboxMessage))showNotifications(inboxView,true);return;}
  if(b.dataset.notificationRead){if(markActivityRead(b.dataset.notificationRead))showNotifications(inboxView,true);return;}
  if(b.dataset.notificationOpen)return openActivity(b.dataset.notificationOpen);

  if(b.dataset.action){e.preventDefault();return handleAction(b.dataset.action,b);}
  if(b.dataset.contribution)return openContribution(b.dataset.contribution);
  if(b.dataset.person)return window.VoidProfiles.open(b.dataset.person);
  if(b.dataset.messageAction){$('context-menu').hidden=true;return messageAction(b.dataset.messageAction,b.dataset.id,b);}
  if(b.dataset.confirmDelete)return removeMessage(b.dataset.confirmDelete);
  if(b.dataset.react){const m=state.messages[key()].find(m=>m.id===b.dataset.id);if(!m)return;let r=m.reactions.find(r=>r.emoji===b.dataset.react);if(!r){r={emoji:b.dataset.react,count:0,mine:false};m.reactions.push(r);}r.mine=!r.mine;r.count=Math.max(0,r.count+(r.mine?1:-1));m.reactions=m.reactions.filter(r=>r.count);m.updatedAt=Date.now();persist();renderMessages();return;}
  if(b.dataset.collapse){const k=b.dataset.collapse==='text'?'collapseText':'collapseVoice';state.settings[k]=!state.settings[k];persist();renderChannels();return;}
  if(b.dataset.discoverCategory)return showDiscovery(b.dataset.discoverCategory);
  if(b.dataset.discoverJoin)return joinDiscovery(b.dataset.discoverJoin);
  if(b.dataset.dm)return dm(b.dataset.dm);
  if(b.dataset.contact){toggleFriend(b.dataset.contact);b.textContent=state.friends.includes(b.dataset.contact)?'Added ✓':'Add';return;}
  if(b.dataset.searchMessage)return openMessageSource(b.dataset.searchKey,b.dataset.searchMessage);
  if(b.dataset.navigateServer){closeModal();return changeContext(b.dataset.navigateServer,b.dataset.navigateChannel||'general');}
  if(b.dataset.jumpModal){closeModal();return jump(b.dataset.jumpModal);}
  if(b.dataset.jump)return jump(b.dataset.jump);
  if(b.dataset.emoji){if(readOnly())return toast('This channel is read only.');const n=$('message-input'),start=n.selectionStart??n.value.length;n.value=n.value.slice(0,start)+b.dataset.emoji+n.value.slice(n.selectionEnd??start);closeModal();n.focus();n.selectionStart=n.selectionEnd=start+b.dataset.emoji.length;draft();resizeInput();return;}
  if(b.dataset.image){const m=state.messages[key()].find(m=>m.id===b.dataset.image);if(m?.image)modal(`<h2 class="sr-only">Shared image</h2><img class="image-inspection" src="${m.image}" alt="Shared image"><a class="secondary-button" href="${m.image}" download="VOIDLINE-image">Save image</a>`,{wide:true,className:'image-dialog'});return;}
  if(b.hasAttribute('data-start-challenge')){closeModal();changeContext('studio','work-in-progress');return;}
 });
 document.addEventListener('error',event=>{if(event.target?.classList?.contains('avatar-image'))event.target.hidden=true;},true);
 document.addEventListener('contextmenu',e=>{const n=e.target.closest('[data-message-id]');if(!n)return;const m=state.messages[key()].find(m=>m.id===n.dataset.messageId);if(m){e.preventDefault();openMessageMenu(m,n,e.clientX,e.clientY);}});
 document.addEventListener('keydown',e=>{
  if(window.VoidEntrance?.isPlaying?.())return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();showCommands();}
  if((e.ctrlKey||e.metaKey)&&e.key===','){e.preventDefault();window.VoidProfiles.settings();}
  if(e.target.dataset?.inboxTab&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const views=['unread','mentions','activity'],current=views.indexOf(inboxView),next=e.key==='Home'?0:e.key==='End'?2:(current+(e.key==='ArrowRight'?1:2))%3;showNotifications(views[next],true);return;}
  if(e.key==='Escape'){$('context-menu').hidden=true;if(!$('app-modal').open){if(closeLocalDrawers()){e.preventDefault();return;}closeThread();}}
  if(e.key==='Tab'&&!$('app-modal').open){const list=drawerFocusables();if(list.length){const first=list[0],last=list.at(-1);if(e.shiftKey&&(document.activeElement===first||!list.includes(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||!list.includes(document.activeElement))){e.preventDefault();first.focus();}}}
  if(e.target.id==='thread-input'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();sendThread({preventDefault(){}});}
  if(e.target.id==='command-input'&&['ArrowDown','ArrowUp','Enter'].includes(e.key)){e.preventDefault();const list=Array.from($('command-results').querySelectorAll('button'));let idx=list.findIndex(n=>n.classList.contains('selected'));if(e.key==='Enter'){list[Math.max(0,idx)]?.click();return;}list.forEach(n=>{n.classList.remove('selected');n.setAttribute('aria-selected','false');});idx=(idx+(e.key==='ArrowDown'?1:-1)+list.length)%list.length;list[idx]?.classList.add('selected');list[idx]?.setAttribute('aria-selected','true');if(list[idx])e.target.setAttribute('aria-activedescendant',list[idx].id);list[idx]?.scrollIntoView({block:'nearest'});}
  if(!$('context-menu').hidden&&['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();const list=Array.from($('context-menu').querySelectorAll('button')),idx=list.indexOf(document.activeElement);list[(idx+(e.key==='ArrowDown'?1:-1)+list.length)%list.length]?.focus();}
 });
 window.addEventListener('storage',event=>{if(!event.key?.startsWith('voidline.archive.v3.'))return;try{const before=Object.values(state.messages).flat().length;const latest=durable.load();replaceState(latest);committed=clone(state);renderAll();scheduleRead();const after=Object.values(state.messages).flat().length;if(after>before)$('message-announcer').textContent='Your archive received an update from another tab.';}catch(_){toast('The archive update could not be read. Export recovery before closing.');}});
 window.addEventListener('voidline:progress',e=>{if(e.detail?.kind==='profile')state.profile.customizedAt=Date.now();progress();persist();renderMembers();});
 window.addEventListener('voidline:artifact-earned',e=>{if(e.detail?.name)notify('Artifact acquired: '+e.detail.name,'',e.detail.id);renderMembers();});
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
 window.addEventListener('beforeunload',event=>{draft();if(activeThreadKey)threadDrafts.set(activeThreadKey,$('thread-input')?.value||'');saveTab();stopRecording(true);if(sessionIssue||failedMutations.length||window.VoidProfiles?.hasUnsavedChanges?.()){event.preventDefault();event.returnValue='';}});
 window.addEventListener('pagehide',()=>{draft();saveTab();});
 window.addEventListener('resize',resizeLocalPanels);window.addEventListener('voidline:entered',resizeLocalPanels);document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleRead();else saveTab();});
 window.VoidApp={...api,normalize,format,changeContext,sendMessage,sendThread,messageAction,removeMessage,createLocalServer,addChannel,canModerate,renderAll,reconcile,searchResults,searchArchive,bookmarkedMessages,toggleBookmark,removeBookmark,toggleFavorite,setContextFilter,getContextEntries,inboxEntries,markInboxRead,markAllInboxRead,openMessageSource,prepareImport,commitImport,closeThread,closeLocalDrawers};
 window.dispatchEvent(new Event('voidline:ready'));
}
function launch(){try{boot();}catch(error){console.error('VOIDLINE could not initialize',error);window.VoidEntrance?.skip?.();const feed=$('chat-feed');if(feed){feed.innerHTML='<div class="client-error"><span class="eyebrow">CLIENT INITIALIZATION</span><h2>The signal was interrupted.</h2><p>Your saved archive has not been cleared. Reload the client, or export this session before trying again.</p><button id="retry-client" class="primary-button">Reload client</button><button id="export-recovery" class="secondary-button">Export archive</button></div>';$('retry-client').addEventListener('click',()=>location.reload());$('export-recovery').addEventListener('click',exportData);}}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',launch);else launch();
})();
