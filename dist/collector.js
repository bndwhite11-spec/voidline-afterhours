/* Family browsing and Choice Capsules. The server is the only inventory and award authority. */
(() => {
  'use strict';
  const tiers = ['Common','Uncommon','Rare','Epic','Legendary','Mythic'];
  const modes = [['models','All models'],['owned','Owned copies'],['arrivals','New arrivals'],['duplicates','Duplicates']];
  const online = () => navigator.onLine !== false;
  const date = value => Number.isFinite(Number(value)) && value != null ? new Date(Number(value)).toLocaleString() : 'Date unavailable';
  const percent = (weight,total) => total > 0 ? new Intl.NumberFormat(undefined,{style:'percent',maximumFractionDigits:2}).format(weight / total) : 'Unavailable';

  function create(host) {
    const {app,esc} = host;
    const $ = selector => document.querySelector(selector);
    let filters = {mode:'models',family:'',tier:'',sort:'family',offset:0};
    let state = null, pending = new Map(), busy = new Set(), screen = null, serial = 0, pageSeq = 0, playback = null, timer = null, audio = null, soundOpted = false;
    let surface='library';
    let dirtyPage=false, capsuleOffset=0, returnFocus = null, savedTop = 0, soundOwner = '', lastPage = null;
    const announced = new Set();
    const id = () => app.state.account?.id;
    const accountGuard = () => {const current = app.guard(), account = id();return () => !!account && id() === account && current();};
    const stageArt = () => window.VoidCollectibleArt;
    const reduced = () => document.documentElement.classList.contains('vh-reduced-motion') || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const button = (action,label,attrs='',primary=false) => '<button type="button" class="'+(primary?'vh-primary':'vh-secondary')+'" data-cl="'+action+'" '+attrs+'>'+esc(label)+'</button>';
    const offline = '<p class="cl-notice" role="status">Offline. Reconnect to check ownership or submit a change.</p>';
    const key = capsule => 'voidline.capsule.pending.v1.' + id() + '.' + capsule;
    const preferenceKey = () => 'voidline.collectible.sound.'+id();
    function readHint(capsule) {
      if(pending.has(capsule))return pending.get(capsule);
      try{const hint=JSON.parse(localStorage.getItem(key(capsule))||'null');if(hint && typeof hint.clientId==='string' && typeof hint.familyId==='string')return hint;}catch{}
      return null;
    }
    function saveHint(capsule,hint) {
      if(hint)pending.set(capsule,hint);else pending.delete(capsule);
      try{if(hint)localStorage.setItem(key(capsule),JSON.stringify(hint));else localStorage.removeItem(key(capsule));}catch{}
    }
    function loadSoundPreference(){
      if(soundOwner===id())return;
      soundOwner=id();soundOpted=false;
      try{soundOpted=localStorage.getItem(preferenceKey())==='1';}catch{}
    }
    function stopSound(){if(audio){audio.close?.().catch(()=>{});audio=null;}}
    function primeSound(){
      stopSound();
      if(!soundOpted || reduced() || document.hidden)return;
      try{const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){audio=new Audio();audio.resume().catch(()=>{});}}catch{}
    }
    function chime(){
      if(!soundOpted||!audio||audio.state!=='running'||document.hidden||reduced())return;
      try{const at=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();osc.type='sine';osc.frequency.setValueAtTime(410,at);osc.frequency.exponentialRampToValueAtTime(230,at+.12);gain.gain.setValueAtTime(.025,at);gain.gain.exponentialRampToValueAtTime(.0001,at+.14);osc.connect(gain);gain.connect(audio.destination);osc.start(at);osc.stop(at+.15);}catch{}
    }
    function refreshWhenClosed(){
      if(!dirtyPage||!host.active()||!id()||document.getElementById('home-dialog')?.open)return;
      dirtyPage=false;void open({force:true});
    }
    function stopAnimation() {
      if(timer!==null){clearTimeout(timer);timer=null;}
      if(playback){playback.abort.abort();playback.player?.stop?.();stageArt()?.stop?.(playback.stage);playback=null;}
    }
    function close() {
      serial++;screen=null;stopAnimation();stopSound();
    }
    function reset(){
      close();pageSeq++;surface='library';state=null;lastPage=null;pending=new Map();busy=new Set();announced.clear();soundOwner='';soundOpted=false;dirtyPage=false;capsuleOffset=0;returnFocus=null;savedTop=0;
      filters={mode:'models',family:'',tier:'',sort:'family',offset:0};
    }
    function visible(s) {return screen===s && s.valid() && s.node.isConnected && app.state.dialogGeneration===s.ticket;}
    function shell(title,copy) {
      close();const ticket=host.dialog(title,copy,'<div class="cl-sheet" id="cl-sheet"></div>'),node=$('#cl-sheet');
      if(!node)return null;
      screen={ticket,node,valid:accountGuard(),serial:++serial,data:null};
      return screen;
    }
    function line(label,value){return '<div><dt>'+esc(label)+'</dt><dd>'+esc(value)+'</dd></div>';}
    function blockError(s,error){
      if(!visible(s))return;
      const node=s.node.querySelector('[data-cl-error]');if(node)node.textContent=error?.message||'This action could not finish.';
    }
    function option(value,label,selected){return '<option value="'+esc(value)+'" '+(value===selected?'selected':'')+'>'+esc(label)+'</option>';}
    function archivedPoster(item) {
      const card=item.originalArt?.card;
      if(!card||!item.originalArt?.detail||!/^[a-z0-9-]+$/.test(item.id)||!/^[a-f0-9]{64}$/.test(card.sha256))return '';
      const url='/art/v4/'+item.id+'-card.'+card.sha256.slice(0,12)+'.svg';
      if(card.url!==url)return '';
      const current=stageArt()?.items?.().find(record=>record.id===item.id);
      return current?.cardURL===url&&current.detailSHA256===item.originalArt.detail.sha256?'':url;
    }
    function artStage(item,large=false) {
      const original=archivedPoster(item);
      const html=original?'<img class="cl-original-poster" src="'+esc(original)+'" alt="'+esc(item.alt||item.name)+'" width="256" height="256">':host.art(item.id,large,item.name);
      return '<div class="cl-art'+(large?' cl-art-lg':'')+'" data-cl-model="'+esc(item.id)+'">'+(stageArt()?.backdrop?.(item.id)||'')+'<div class="cl-object">'+html+'</div><span class="cl-art-missing" '+(html?'hidden':'')+'>Artwork unavailable · '+esc(item.name)+'</span></div>';
    }
    function formatModel(item) {
      return [item?.familyName||host.familyName(item?.familyId),item?.tier].filter(Boolean).join(' · ');
    }
    function describeCopies(n){return n===1?'1 owned copy':n+' owned copies';}
    function reference(value){const v=String(value||'');return v.length>16?'…'+v.slice(-10):v;}
    function modelCard(item,copy){
      const copyId=copy?.id||'', count=host.summary()?.modelCounts?.[item.id]||0;
      const attrs='data-model="'+esc(item.id)+'" '+(copy?'data-copy="'+esc(copyId)+'"':'');
      const edition=host.edition?.(item)||(item.acquisitionPolicy==='capsule-only'||item.familyId?'Capsule edition':'Free edition');
      const label=copy ? (copy.pending_transfer_id?'Transfer pending':copy.is_new?'New arrival':'Owned copy') : describeCopies(count);
      return '<article class="cl-tile"><button class="cl-tile-open" data-cl="inspect" '+attrs+' aria-label="'+esc('Inspect '+item.name+(copy?' copy '+reference(copyId):''))+'">'+artStage(item)+'<span class="cl-tile-info"><span class="cl-kicker">'+esc(edition+(item.tier?' · '+item.tier:''))+'</span><strong>'+esc(item.modelName||item.name)+'</strong><small>'+esc(label)+(copy?' · '+esc(reference(copyId)):'')+'</small></span></button></article>';
    }
    function capsuleRows(){
      if(!state)return '';
      const rows=state.capsules||[],ready=rows.filter(c=>!c.openedAt);
      const row=c=>button('capsule',c.openedAt?(c.acknowledgedAt?'View opening':'View new result'):'Choose family','data-id="'+esc(c.id)+'"') ;
      const card=c=>'<li><div><b>'+esc(c.name||'Choice Capsule')+'</b><small>'+esc(c.source==='weekly'?'Weekly participation':'Welcome capsule')+' · '+esc(date(c.earnedAt))+'</small></div>'+row(c)+'</li>';
      const p=state.progress;
      let progress='';
      if(p?.qualifyingAction){
        const required=Number(p.required)||3,days=Math.min(required,Math.max(0,Number(p.days)||0));
        progress='<div class="cl-progress"><b>Weekly participation</b><span>'+days+' of '+esc(required)+' UTC days</span><progress value="'+days+'" max="'+required+'" aria-label="Qualifying days this week"></progress><small>'+esc(p.qualifyingAction)+' Next week starts '+esc(date(p.nextWeek))+'.</small>'+
          (p.checkInAvailable?(p.checkedInToday?'<small>Today’s participation is recorded.</small>':button('check-in','Check in for today',online()?'':'disabled',true)):'')+'</div>';
        const milestone=p.milestone;
        if(milestone?.available||milestone?.earned){
          const model=host.model(milestone.modelId);
          progress+='<div class="cl-progress cl-milestone"><b>First weekly milestone</b><span>'+esc(milestone.earned?'Awarded':'Guaranteed reward')+'</span><small>Your first qualifying weekly capsule in this edition awards one original '+esc(model?.name||'Copium Cartridge')+' in addition to the capsule.</small>'+
            (milestone.modelId?button('inspect','View reward','data-model="'+esc(milestone.modelId)+'"'):'')+'</div>';
        }
      }
      const canReconcile=state.issuingEnabled!==false && state.welcomeEligible;
      const closed=rows.filter(c=>c.openedAt),hasPages=state.page?.total>50;
      return '<section class="cl-drawer"><header><div><h3>Choice Capsules</h3><p>'+ready.length+' unopened'+(hasPages?' on this page':'')+' · Choose a family to receive one collectible.</p></div>'+ (canReconcile?button('reconcile','Claim welcome capsule',online()?'':'disabled',true):'')+'</header>'+progress+(ready.length?'<ul class="cl-capsules">'+ready.map(card).join('')+'</ul>':'')+(closed.length?'<details '+(closed.some(c=>!c.acknowledgedAt)?'open':'')+'><summary>Previous openings ('+closed.length+')</summary><ul class="cl-capsules">'+closed.map(card).join('')+'</ul></details>':'')+(hasPages?'<div class="vc-pagination">'+button('caps-prev','Previous capsules',capsuleOffset>0?'':'disabled')+'<span>'+esc(capsuleOffset+1)+'–'+esc(Math.min(capsuleOffset+50,state.page.total))+' of '+esc(state.page.total)+'</span>'+button('caps-next','Older capsules',state.page.hasMore?'':'disabled')+'</div>':'')+(state.issuingEnabled===false?'<p class="cl-notice">New capsule awards are temporarily paused.</p>':'')+'</section>';
    }
    function allItems(){return host.items().filter(item=>item.type==='gift');}
    const familyKey=item=>item.familyId||item.collectionFamilyId||(item.series==='Copium Cartridges'||item.id==='gift-copium-cartridge'?'copium-cartridge':'legacy');
    function familyList(){
      const result=new Map();for(const item of allItems())if(familyKey(item)!=='legacy')result.set(familyKey(item),familyKey(item)==='copium-cartridge'?'Copium Cartridges':item.familyName||host.familyName(familyKey(item)));
      return result;
    }
    function tools(){
      const sum=host.summary()||{},family=familyList();
      const visibleModes=surface==='copies'?modes.filter(([key])=>key!=='models'):modes;
      return '<div class="cl-modes" role="group" aria-label="Collection views">'+visibleModes.map(([key,label])=>button('mode',label,'data-mode="'+key+'" aria-pressed="'+(filters.mode===key)+'"')).join('')+'</div>'+
        '<div class="cl-filters"><label>Family<select data-cl-filter="family">'+option('','All families',filters.family)+[...family].map(([key,label])=>option(key,label,filters.family)).join('')+option('legacy','Legacy designs',filters.family)+'</select></label>'+
        '<label>Tier<select data-cl-filter="tier">'+option('','Any tier',filters.tier)+tiers.map(t=>option(t,t,filters.tier)).join('')+'</select></label>'+
        '<label>Sort<select data-cl-filter="sort">'+(filters.mode==='models'?[]:[['recent','Newest first'],['oldest','Oldest first']]).concat([['family','Family'],['rarity','Tier']]).map(([key,label])=>option(key,label,filters.sort)).join('')+'</select></label></div>'+
        '<p class="cl-count">'+esc(sum.totalCopies??0)+' owned copies · '+esc(sum.duplicateCopies??0)+' duplicates · '+esc(sum.newArrivals??0)+' new arrivals</p>';
    }
    function familiesHTML(items,rows) {
      const groups=new Map(),sum=host.summary()||{},known=new Map(allItems().map(i=>[i.id,i]));
      const add=(model,copy)=>{
        const key=familyKey(model);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(modelCard(model,copy));
      };
      if(rows) {
        for(const row of rows){const item=known.get(row.catalog_id)||{id:row.catalog_id,name:row.model?.name||row.name||'Unavailable model',familyId:row.family_id||'',tier:row.model?.tier};add(item,row);}
      }else for(const item of items)add(item,null);
      if(!groups.size){
        const hint=filters.mode==='owned'&&!filters.family&&!filters.tier?'Find a free design in Discover, open an earned capsule, or accept a gift.':'Try another family or view.';
        return '<div class="vc-empty"><h3>'+({owned:'No copies here yet',arrivals:'No new arrivals',duplicates:'No duplicates yet',models:'No matching models'})[filters.mode]+'</h3><p>'+hint+'</p></div>';
      }
      return [...groups].map(([family,cards])=>{
        const info=sum.families?.find(f=>f.familyId===family);
        return '<section class="cl-family"><header><h3>'+esc(family==='legacy'?'Original gifts':family==='copium-cartridge'?'Copium Cartridges':host.familyName(family))+'</h3>'+(info?'<span>'+esc(info.ownedModels)+' of '+esc(info.totalModels)+' models owned'+(Number.isFinite(info.discoveredModels)?' · '+esc(info.discoveredModels)+' discovered':'')+'</span>':'')+'</header><div class="cl-grid">'+cards.join('')+'</div></section>';
      }).join('');
    }
    function currentModels(){
      const selected=allItems().filter(i=>(!filters.family||(filters.family==='legacy'?!i.familyId:familyKey(i)===filters.family))&&(!filters.tier||String(i.tier).toLowerCase()===filters.tier.toLowerCase()));
      const rank=item=>tiers.findIndex(t=>t.toLowerCase()===String(item.tier).toLowerCase());
      return selected.sort((a,b)=>(filters.sort==='rarity'?rank(b)-rank(a):0)||Number(!a.familyId)-Number(!b.familyId)||String(a.familyName||'').localeCompare(b.familyName||'')||rank(a)-rank(b)||a.name.localeCompare(b.name));
    }
    function query(){
      const q=new URLSearchParams({offset:String(filters.offset),sort:filters.sort});
      if(filters.family)q.set('familyId',filters.family);if(filters.tier)q.set('tier',filters.tier.toLowerCase());
      if(filters.mode==='arrivals')q.set('arrival','1');if(filters.mode==='duplicates')q.set('duplicate','1');
      return '/api/cosmetics/instances?'+q;
    }
    function sharing(){
      const audience=host.visibility();
      return '<details class="cl-sharing"><summary>Inventory privacy</summary><label>Full collectible inventory<select data-cl-visibility>'+[['private','Only me'],['friends','Friends'],['shared','Friends and shared communities'],['public','Public']].map(([key,label])=>option(key,label,audience)).join('')+'</select></label><p>The profile showcase has its own audience. Earning history and receipts stay private.</p></details>';
    }
    function collectionLinks(){
      if(surface==='earn')return '<div class="vc-directory-links"><button class="vh-text-button" data-vc-action="badges">Earned badge directory</button></div>';
      if(surface==='copies')return '<div class="vc-directory-links"><button class="vh-text-button" data-vc-action="section" data-section="browse">Discover gifts</button><button class="vh-text-button" data-vc-action="section" data-section="collector">Earn capsules</button>'+
        (window.VoidGiftCollections?'<button class="vh-text-button" data-vc-action="organize-gifts">Organize gifts</button>':'')+
        '<button class="vh-text-button" data-vc-action="owned-decorations">My decorations</button></div>';
      return '';
    }
    async function open({force=false,surface:next=surface}={}){
      const seq=++pageSeq,connected=online();
      if(next!==surface){
        surface=next;lastPage=null;rememberFilter();
        if(next==='copies'){filters.mode='owned';filters.sort='recent';filters.family='';filters.tier='';}
      }
      host.activate(surface);
      if(!connected&&lastPage){host.page(offline+lastPage);return;}
      if(!connected){host.page(offline+button('reload','Try again'));return;}
      const page=host.page('<p role="status">Loading collection…</p>'),valid=accountGuard();
      try{
        const [caps,results]=await Promise.all([
          surface==='copies'?null:app.request('/api/capsules'+(capsuleOffset?'?offset='+capsuleOffset:'')),
          surface==='earn'||filters.mode==='models'?null:app.request(query()),
          surface==='earn'?null:host.refresh(force)
        ]);
        if(!valid()||seq!==pageSeq||!host.active()||app.state.dialogGeneration!==page)return;
        if(caps)state=caps;
        const pages=results?.total>30?'<div class="vc-pagination">'+button('prev','Previous',filters.offset>0?'':'disabled')+'<span>'+esc(filters.offset+1)+'–'+esc(Math.min(filters.offset+30,results.total))+' of '+esc(results.total)+'</span>'+button('next','Next',filters.offset+30<results.total?'':'disabled')+'</div>':'';
        lastPage=(surface==='copies'?'':capsuleRows())+(surface==='earn'?'':tools()+familiesHTML(currentModels(),results?.instances)+pages+sharing())+collectionLinks();
        host.page(lastPage);
        const container=document.getElementById('home-main');if(container){container.scrollTop=savedTop;if(returnFocus){const n=[...container.querySelectorAll('[data-cl]')].find(b=>returnFocus.every(([k,v])=>b.dataset[k]===v));n?.focus?.({preventScroll:true});}}returnFocus=null;
      }catch(error){if(valid()&&seq===pageSeq&&host.active()){host.page('<p class="cl-notice" role="alert">'+esc(error.message||'Your collection could not load.')+'</p>'+button('reload','Try again'));}}
    }
    function remember(b){savedTop=document.getElementById('home-main')?.scrollTop||0;returnFocus=Object.entries(b.dataset).filter(([k])=>['cl','id','model','copy'].includes(k));}
    function rememberFilter(){savedTop=0;returnFocus=null;filters.offset=0;}
    function status(s,message){const node=s.node.querySelector('[data-cl-status]');if(node)node.textContent=message;}
    function capsuleArt(container,open=false){
      const obj=window.VoidlineCapsuleStage?.create?.(document);
      if(obj){if(open)obj.classList.add('is-open');container.replaceChildren(obj);}
    }
    function choiceFamily(family,selected,locked){
      const summary=host.summary(),models=family.models||[],known=Array.isArray(summary?.discoveredModelIds)?new Set(summary.discoveredModelIds):null;
      const owned=models.filter(model=>Number(summary?.modelCounts?.[model.id])>0).length;
      const progress=(summary?.modelCounts?owned+' of '+models.length+' eligible models owned':models.length+' eligible models')+(known?' · '+models.filter(model=>known.has(model.id)).length+' discovered':'');
      const artwork=models.slice(0,3).map(frozen=>{
        const model={...host.model(frozen.id),...frozen},original=archivedPoster(model);
        return '<span>'+(original?'<img src="'+esc(original)+'" alt="" width="128" height="128">':host.art(model.id))+'</span>';
      }).join('');
      return '<button type="button" data-cl="family" data-family="'+esc(family.id)+'" aria-pressed="'+selected+'" '+(locked?'disabled':'')+'><span class="cl-family-posters" aria-hidden="true">'+artwork+'</span><span class="cl-family-copy"><strong>'+esc(family.name)+'</strong><small>'+esc(progress)+'</small></span></button>';
    }
    function bindFamily(s,chosen){
      const data=s.data,hint=readHint(data.capsule.id);
      const family=data.families.find(f=>f.id===(hint?.familyId||chosen))||data.families[0];s.family=family;
      const families=data.families||[],body=s.node,canOpen=data.openingEnabled??state?.openingEnabled??true;
      if(!family){body.innerHTML='<p role="status">This capsule’s contents are unavailable. Your capsule is saved.</p>';return;}
      const total=family.models.reduce((n,m)=>n+m.weight,0);
      body.innerHTML='<div class="cl-choice-stage" data-cl-packing></div><div class="cl-choice"><b>'+esc(data.capsule.source==='weekly'?'Weekly capsule':'Welcome capsule')+'</b>'+
        (families.length>1?'<fieldset class="cl-family-choices"><legend>Choose a family</legend>'+families.map(f=>choiceFamily(f,f.id===family.id,!!hint)).join('')+'</fieldset><p class="cl-choice-note">These are the families available in this capsule. Preview a model below to compare its details.</p>':'<h3>'+esc(family.name)+'</h3>')+
        '<details open><summary>View contents and odds</summary><p>One model from '+esc(family.name)+' · Table '+esc(family.tableVersion)+'</p><ul class="cl-odds">'+family.models.map(m=>'<li><span>'+host.art(m.id)+'<button type="button" data-cl="preview-contents" data-model="'+esc(m.id)+'">'+esc(m.name)+'</button></span><span>'+esc(m.tier)+' · '+percent(m.weight,total)+'</span></li>').join('')+'</ul></details>'+
        '<label class="cl-sound"><input type="checkbox" data-cl-sound '+(soundOpted?'checked':'')+'> Play a quiet opening sound</label><p data-cl-status role="status">'+(hint?'A previous request used this family. You can check its result or retry that same request.':'Opening adds one owned copy. Duplicates are possible.')+'</p><p data-cl-error role="alert"></p><div class="cl-actions">'+(hint?button('recover','Check result'):'')+button('open',hint?'Retry same opening':'Open capsule',!online()||!canOpen?'disabled':'',true)+'</div>'+(!canOpen?'<p>New openings are temporarily paused. This capsule is saved.</p>':'')+'</div>';
      capsuleArt(body.querySelector('[data-cl-packing]'));
    }
    function previewContents(s,modelId){
      const frozen=s.family?.models.find(model=>model.id===modelId);if(!frozen)return;
      stopAnimation();const model={...host.model(modelId),...frozen,id:modelId};s.sample=modelId;
      s.node.innerHTML='<section class="cl-sample">'+artStage(model,true)+'<h3>'+esc(model.name)+'</h3><p>'+esc(s.family.name)+' · '+esc(frozen.tier)+'</p><p>'+esc(model.description||'')+'</p><div class="cl-actions">'+(archivedPoster(model)?'<span>Original capsule artwork</span>':button('sample-play','Play model'))+button('sample-back','Back to capsule')+'</div><p data-cl-status role="status">Preview only. Your selected family is unchanged.</p></section>';
      s.node.querySelector('[data-cl="sample-back"]')?.focus();
    }
    async function playSample(s,b){
      stopAnimation();if(reduced()){status(s,'Reduced motion is on. The resting artwork is shown.');return;}
      const stage=s.node.querySelector('.cl-object');if(!stage)return;
      const run={abort:new AbortController(),stage,player:null};playback=run;b.disabled=true;
      try{
        const player=await stageArt()?.preview?.(stage,s.sample,{detail:true,signal:run.abort.signal});
        if(!visible(s)||playback!==run){player?.stop?.();return;}
        run.player=player;if(!player?.played){status(s,'Motion unavailable. The resting artwork is shown.');return;}
        status(s,'Preview playing.');await player.finished;if(visible(s)&&playback===run)status(s,'Preview complete.');
      }catch{if(visible(s))status(s,'Motion unavailable. The resting artwork is shown.');}
      finally{if(b.isConnected)b.disabled=false;}
    }
    async function capsule(capsuleId,opts={}){
      if(!id())return;
      loadSoundPreference();
      const s=shell('Choice Capsule','One collectible from the family you choose.');if(!s)return;
      s.capsuleId=capsuleId;
      s.node.innerHTML='<p role="status">Checking capsule…</p>';
      try{
        const d=await app.request('/api/capsules/'+encodeURIComponent(capsuleId));if(!visible(s))return;
        s.data=d;if(d.opening){saveHint(capsuleId,null);return committed(s,d.opening,false);}
        bindFamily(s,opts.family);
      }catch(error){if(visible(s))s.node.innerHTML='<p role="alert">'+esc(error.message||'Capsule unavailable')+'</p>'+button('recover','Check again');}
    }
    async function recover(s,afterSubmit=false){
      if(!online()){blockError(s,Error('Reconnect to confirm the saved result.'));return;}
      try{
        const d=await app.request('/api/capsules/'+encodeURIComponent(s.capsuleId));if(!visible(s))return;
        s.data=d;
        if(d.opening){saveHint(s.capsuleId,null);host.invalidate();dirtyPage=true;committed(s,d.opening,false,afterSubmit);}
        else bindFamily(s,s.family?.id);
      }catch(error){if(visible(s))s.node.innerHTML='<p role="status">The opening could not be confirmed. Your capsule and original request can be checked later.</p><p data-cl-error role="alert">'+esc(error.message)+'</p>'+button('recover','Check result');}
    }
    async function submit(s){
      if(!visible(s)||!s.family||s.opening||busy.has(s.capsuleId))return;
      if(!online()){blockError(s,Error('Connect before opening a capsule.'));return;}
      const cap=s.capsuleId,existing=readHint(cap);
      if(existing&&existing.familyId!==s.family.id){
        s.node.innerHTML='<p role="status">Another view submitted this capsule for a different family. Confirming its saved state…</p><p data-cl-error role="alert"></p>';
        await recover(s);return;
      }
      const hint=existing||{familyId:s.family.id,clientId:crypto.randomUUID()},valid=accountGuard(),ownBusy=busy;
      saveHint(cap,hint);ownBusy.add(cap);primeSound();
      s.node.innerHTML='<p data-cl-status role="status">Opening your capsule…</p><p>You can close this view and return to the same capsule.</p><p data-cl-error role="alert"></p>';
      try{
        const result=await app.request('/api/capsules/'+encodeURIComponent(cap)+'/open',hint);
        if(!valid())return;
        if(!result?.opening?.instanceId||result.opening.capsuleId!==cap)throw Error('The saved result could not be verified.');
        saveHint(cap,null);host.invalidate();dirtyPage=true;if(visible(s))committed(s,result.opening,!result.alreadyOpened,true);else refreshWhenClosed();
      }catch(error){
        if(!valid()||!visible(s))return;
        if(error.code==='opening_paused'){saveHint(cap,null);s.data.openingEnabled=false;bindFamily(s,hint.familyId);blockError(s,error);return;}
        if(error.status>=400&&error.status<500&&error.status!==408&&error.status!==409&&error.status!==429){
          saveHint(cap,null);bindFamily(s,hint.familyId);blockError(s,error);return;
        }
        s.node.innerHTML='<p role="status">Confirming your capsule result</p><p>The connection changed. Checking the original capsule…</p><p data-cl-error role="alert"></p>';
        await recover(s,true);
      }finally{ownBusy.delete(cap);}
    }
    function resultModel(o){
      const original=o.model||{},live=host.model(o.modelId);
      return {...live,...original,id:o.modelId,name:original.name||live?.name||o.modelId,familyName:original.familyName||live?.familyName||host.familyName(o.familyId)};
    }
    function resultMessage(o){if(!o.currentlyOwned)return 'Historical award · Transferred';if(o.discovery==='first')return 'New model discovered';return o.discovery==='returning'?'Added back to your collection':'Another copy added';}
    function buttonsForResult(o,m){
      return (o.currentlyOwned?button('view-copy','View collectible','',true):'')+
        (o.currentlyOwned&&!o.currentlyReserved?button('display','Display on profile')+button('gift','Gift this copy'):'')+
        (archivedPoster(m)?'':button('replay','Replay reveal'))+(!o.acknowledgedAt?button('ack','Mark seen'):'');
    }
    function finish(s,reason=''){
      if(!visible(s)||!s.opening)return;const restoreFocus=s.node.contains(document.activeElement);stopAnimation();stopSound();
      const o=s.opening,m=resultModel(o);
      const metadata=line('Edition','Capsule edition')+line('Backdrop',m.backdrop?.name||'Legacy')+line('Motif',m.motif||'None')+
        line('Chance in this capsule',percent(o.weight,o.totalWeight))+line('Table',o.tableVersion)+(m.artRevision?line('Artwork revision',m.artRevision):'')+line('Copy',reference(o.instanceId));
      const ownership=o.currentlyOwned?(o.currentlyReserved?'Transfer pending · You own this copy until acceptance.':'This copy is in your collection.'):'You received this copy here. It has since left your collection.';
      s.node.innerHTML='<div class="cl-result" data-cl-state="result" data-instance="'+esc(o.instanceId)+'" data-model="'+esc(o.modelId)+'">'+artStage(m,true)+
        '<div><p class="cl-kicker">'+esc(resultMessage(o))+'</p><h3>'+esc(m.name)+'</h3><p>'+esc(formatModel(m))+'</p>'+
        '<p class="cl-result-note">'+esc(ownership)+'</p><div class="cl-actions">'+buttonsForResult(o,m)+'</div>'+
        (reason?'<p class="cl-note">'+esc(reason)+'</p>':'')+'<dl class="cl-metadata">'+metadata+'</dl><p data-cl-error role="alert"></p></div></div>';
      if(restoreFocus)s.node.querySelector('[data-cl="view-copy"],[data-cl="replay"]')?.focus({preventScroll:true});
    }
    function committed(s,o,motion,announce=motion){
      s.opening=o;
      if(!announced.has(o.id)&&announce){announced.add(o.id);app.announce(resultMessage(o)+'. '+resultModel(o).name+'.');}
      if(archivedPoster(resultModel(o))){finish(s,'Original capsule artwork. View the collectible to preview its current animation.');return;}
      if(!motion||reduced()||document.hidden){finish(s);return;}
      reveal(s);
    }
    async function reveal(s){
      if(!visible(s)||!s.opening)return;stopAnimation();
      if(reduced()||document.hidden){finish(s,'Reduced motion uses the resting artwork.');return;}
      const m=resultModel(s.opening),art=stageArt();
      s.node.innerHTML='<div class="cl-reveal" data-cl-state="committed"><div class="cl-reveal-box" data-cl-packing></div>'+artStage(m,true)+'<p data-cl-status>Preparing '+esc(m.name)+'</p>'+button('skip','Skip reveal')+'</div>';
      const wrap=s.node.firstElementChild,stage=wrap.querySelector('.cl-object'),packing=wrap.querySelector('[data-cl-packing]');
      capsuleArt(packing);const run={abort:new AbortController(),stage,player:null};playback=run;
      const active=()=>visible(s)&&playback===run&&!run.abort.signal.aborted;
      try{
        const loaded=await Promise.race([Promise.resolve(art?.prepare?.(stage,m.id,{detail:true,signal:run.abort.signal})),new Promise(done=>{timer=setTimeout(()=>done(null),1000);})]);
        if(!active())return;clearTimeout(timer);timer=null;
        if(!loaded?.svg){finish(s,'The motion could not load. The saved result is available.');return;}
        packing.firstElementChild?.classList.add('is-open');wrap.dataset.clState='revealing';status(s,m.name);chime();
        timer=setTimeout(async()=>{
          if(!active())return;
          try{
            const player=await art.preview(stage,m.id,{detail:true,signal:run.abort.signal});if(!active()){player?.stop?.();return;}
            run.player=player;
            if(!player?.played){finish(s,'Showing the resting artwork.');return;}
            await player.finished;if(active())finish(s);
          }catch{if(active())finish(s,'The motion was interrupted. Your copy is saved.');}
        },650);
      }catch{if(active())finish(s,'The motion is unavailable. Your copy is saved.');}
    }
    function onVisibility(){
      if(!document.hidden&&!reduced())return;
      if(screen?.opening&&visible(screen)&&playback)finish(screen);
      else if(screen?.sample&&playback){stopAnimation();status(screen,'Resting artwork.');}
      stopSound();
    }
    async function act(b){
      if(!id())return;const k=b.dataset.cl,s=screen;
      if(!online()&&['mode','next','prev','caps-prev','caps-next'].includes(k))return app.announce('Reconnect to change your collection view.');
      if(k==='mode'){filters.mode=b.dataset.mode;if(!modes.some(([m])=>m===filters.mode))return;filters.sort=filters.mode==='models'?'family':'recent';rememberFilter();return open();}
      if(k==='next'||k==='prev'){savedTop=0;filters.offset=Math.max(0,filters.offset+(k==='next'?30:-30));return open();}
      if(k==='reload')return open({force:true});
      if(k==='reconcile'||k==='check-in'){
        if(!online())return app.announce('Reconnect to collect an earned capsule.');if(b.disabled)return;b.disabled=true;const valid=accountGuard();
        try{await app.request(k==='check-in'?'/api/capsules/check-in':'/api/capsules/reconcile',{});if(valid()&&host.active())await open({force:true});}finally{if(b.isConnected)b.disabled=false;}return;
      }
      if(k==='caps-prev'||k==='caps-next'){capsuleOffset=Math.max(0,capsuleOffset+(k==='caps-next'?50:-50));return open();}
      if(k==='capsule'){remember(b);return capsule(b.dataset.id);}
      if(k==='inspect'){remember(b);return host.inspect(b.dataset.model,b.dataset.copy,()=>open({force:true}));}
      if(!s||!visible(s))return;
      if(k==='family'&&!readHint(s.capsuleId)&&!busy.has(s.capsuleId)){bindFamily(s,b.dataset.family);s.node.querySelector('[data-family][aria-pressed="true"]')?.focus();return;}
      if(k==='preview-contents')return previewContents(s,b.dataset.model);
      if(k==='sample-play')return playSample(s,b);
      if(k==='sample-back'){const model=s.sample;stopAnimation();bindFamily(s,s.family.id);[...s.node.querySelectorAll('[data-cl="preview-contents"]')].find(b=>b.dataset.model===model)?.focus();return;}
      if(k==='open')return submit(s);
      if(k==='recover')return recover(s);
      if(k==='skip'){finish(s);s.node.querySelector('[data-cl="view-copy"],[data-cl="replay"]')?.focus();return;}
      if(!s.opening)return;
      const o=s.opening;
      if(k==='replay'){
        if(!online()){finish(s,'Offline. Reconnect to replay.');return;}
        primeSound();b.disabled=true;
        try{const data=await app.request('/api/capsules/'+encodeURIComponent(s.capsuleId));if(!visible(s))return;if(!data.opening)throw Error('The saved receipt is unavailable.');s.opening=data.opening;return reveal(s);}
        finally{if(b.isConnected)b.disabled=false;}
      }
      if(k==='ack'&&online()){b.disabled=true;try{const response=await app.request('/api/capsules/'+encodeURIComponent(s.capsuleId)+'/ack',{});if(visible(s)&&response?.opening){dirtyPage=true;committed(s,response.opening,false);}}finally{if(b.isConnected)b.disabled=false;}return;}
      if(k==='view-copy'&&o.currentlyOwned)return host.inspect(o.modelId,o.instanceId,()=>capsule(s.capsuleId));
      if(k==='display'&&o.currentlyOwned&&!o.currentlyReserved)return host.display(o.instanceId);
      if(k==='gift'&&o.currentlyOwned&&!o.currentlyReserved)return host.gift(o.instanceId);
    }
    document.addEventListener('click',e=>{const b=e.target.closest?.('[data-cl]');if(!b||!id())return;e.preventDefault();act(b).catch(err=>{if(screen&&visible(screen))blockError(screen,err);else app.announce(err.message||'This action could not finish.');});});
    document.addEventListener('change',async e=>{
      const input=e.target;if(!id())return;
      if(input.matches?.('[data-cl-filter]')&&host.active()){const field=input.dataset.clFilter;if(!online()){input.value=filters[field];app.announce('Reconnect to change these filters.');return;}if(!['tier','sort','family'].includes(field))return;filters[field]=input.value;rememberFilter();await open();return;}
      if(input.matches?.('[data-cl-sound]')){soundOpted=input.checked;try{localStorage.setItem(preferenceKey(),soundOpted?'1':'0');}catch{}if(!soundOpted)stopSound();}
      if(input.matches?.('[data-cl-visibility]')&&host.active()){
        const value=input.value,valid=accountGuard();if(!online()){input.value=host.visibility();app.announce('Reconnect to change inventory privacy.');return;}
        input.disabled=true;try{await app.request('/api/cosmetics/settings',{fullInventoryVisibility:value});if(valid()&&host.active())await open({force:true});}catch(error){if(valid()){input.value=host.visibility();app.announce(error.message);}}finally{if(input.isConnected)input.disabled=false;}
      }
    });
    document.addEventListener('error',e=>{const art=e.target.closest?.('.cl-art');if(e.target.tagName!=='IMG'||!art)return;e.target.hidden=true;const text=art.querySelector('.cl-art-missing');if(text)text.hidden=false;},true);
    document.addEventListener('close',e=>{if(e.target.id==='home-dialog'){if(screen&&!visible(screen))close();refreshWhenClosed();}},true);
    document.addEventListener('visibilitychange',onVisibility);
    window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change',onVisibility);
    window.addEventListener('voidline:theme',onVisibility);
    window.addEventListener('pagehide',close);
    return {open,reset,close,leave(){pageSeq++;close();}};
  }
  window.VoidCollector=Object.freeze({create});
})();
