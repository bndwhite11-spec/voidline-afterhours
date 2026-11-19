/* Variable-height timeline window. Offscreen rows are detached, with measured spacers. */
(() => {
  'use strict';
  const controllers=new WeakMap(),ESTIMATE=88,OVERSCAN=700,MAX_CACHE=500;
  function create(feed){
    const heights=new Map(),nodes=new Map(),mediaState=new Map(),gaps=[];let items=[],frame=0,observer=null,destroyed=false,follow=true,followResize=false,readingAnchor=null;
    // Recycling earlier rows must not announce them as newly received messages.
    // The messenger announces actual incoming cursor updates separately.
    feed.setAttribute('aria-live','off');
    const top=document.createElement('div'),bottom=document.createElement('div');for(const node of[top,bottom]){node.className='vh-timeline-spacer';node.setAttribute('aria-hidden','true');}
    const height=item=>heights.get(item.key)||ESTIMATE;
    const offsets=()=>{const result=[0];for(const item of items)result.push(result[result.length-1]+height(item));return result;};
    function pins(){const result=new Set(),selected=window.getSelection?.();for(const [key,node]of nodes){if(node.parentNode!==feed)continue;if(node.contains?.(document.activeElement)||(selected&&!selected.isCollapsed&&(node.contains?.(selected.anchorNode)||node.contains?.(selected.focusNode)))||[...(node.querySelectorAll?.('audio,video')||[])].some(media=>!media.paused))result.add(key);}return result;}
    function anchor(){if(!feed.getBoundingClientRect)return null;const top=feed.getBoundingClientRect().top;for(const child of feed.children||[]){if(!child.dataset?.nativeKey||!child.getBoundingClientRect)continue;const rect=child.getBoundingClientRect();if(rect.bottom>top)return{key:child.dataset.nativeKey,offset:rect.top-top};}return null;}
    function restore(saved){if(!saved)return;const node=nodes.get(saved.key);if(node?.parentNode===feed&&node.getBoundingClientRect)feed.scrollTop+=node.getBoundingClientRect().top-feed.getBoundingClientRect().top-saved.offset;}
    function patchMessage(node,fresh){
      // A selected text node must remain connected throughout the patch. Moving
      // it into the detached template, then reattaching it, also loses selection.
      const retained=new Map();
      for(const selector of['.vh-message-text','.vh-reply-preview','.vh-message-attachments']){
        let old=node.querySelector?.(selector),next=fresh.querySelector?.(selector);if(!old||!next||old.outerHTML!==next.outerHTML)continue;
        const pairs=[];while(old!==node&&next!==fresh&&old&&next&&old.tagName===next.tagName){pairs.push([next,old]);old=old.parentNode;next=next.parentNode;}
        if(old===node&&next===fresh)for(const [replacement,current]of pairs)retained.set(replacement,current);
      }
      function patch(current,replacement){
        const attributes=[...replacement.attributes];for(const attribute of[...current.attributes])if(!attributes.some(next=>next.name===attribute.name))current.removeAttribute(attribute.name);for(const attribute of attributes)current.setAttribute(attribute.name,attribute.value);
        const children=[...replacement.childNodes],keep=new Set(children.map(child=>retained.get(child)).filter(Boolean));
        for(const child of[...current.childNodes])if(!keep.has(child))child.remove();
        let cursor=current.firstChild;for(const child of children){const saved=retained.get(child),next=saved||child;if(saved&&saved.outerHTML!==child.outerHTML)patch(saved,child);if(next!==cursor)current.insertBefore(next,cursor);cursor=next.nextSibling;}
      }
      patch(node,fresh);
    }
    function make(item){let node=nodes.get(item.key);if(!node||node.__voidlineHTML!==item.html){const template=document.createElement('template');template.innerHTML=item.html;const fresh=template.content?.firstElementChild;if(!fresh)return null;if(node&&node.tagName===fresh.tagName){const focused=node.contains?.(document.activeElement)?document.activeElement:null,focus=focused?.dataset?{...focused.dataset,tagName:focused.tagName}:null,open=!!node.querySelector?.('details[open]'),touch=node.className.split(/\s+/).filter(name=>name==='is-touched'||name==='is-bar-below');patchMessage(node,fresh);if(touch.length)node.className=[...new Set([...node.className.split(/\s+/),...touch])].filter(Boolean).join(' ');if(open){const menu=node.querySelector('details');if(menu)menu.open=true;}if(focus&&!node.contains(focused)){const replacement=focus.tagName==='SUMMARY'?node.querySelector('details > summary'):focus.tagName==='BUTTON'?[...node.querySelectorAll('button')].find(button=>button.dataset.nativeAction===focus.nativeAction&&button.dataset.event===focus.event&&button.dataset.emoji===focus.emoji):null;(replacement||node).focus({preventScroll:true});}}
      else node=fresh;node.__voidlineHTML=item.html;nodes.set(item.key,node);const saved=mediaState.get(item.key);if(saved)for(const [index,media]of [...node.querySelectorAll('audio,video')].entries()){const position=saved[index];if(position!==undefined){if(media.readyState)media.currentTime=position;else media.addEventListener('loadedmetadata',()=>{media.currentTime=position;},{once:true});}}}return node;}
    function render({targetKey,bottomAnchor=false,preserve=true,savedAnchor=null}={}){
      if(destroyed)return;const saved=preserve?(savedAnchor||anchor()):null,positions=offsets(),savedIndex=saved?items.findIndex(item=>item.key===saved.key):-1,scroll=Math.max(0,savedIndex>=0?positions[savedIndex]-saved.offset:feed.scrollTop),viewport=Math.max(300,feed.clientHeight||600);let first=0,last=items.length;
      while(first<items.length&&positions[first+1]<scroll-OVERSCAN)first++;
      last=first;while(last<items.length&&positions[last]<scroll+viewport+OVERSCAN)last++;
      if(bottomAnchor){last=items.length;first=last;while(first>0&&positions[last]-positions[first]<viewport+OVERSCAN)first--;if(first===last)first=Math.max(0,last-30);}
      if(targetKey){const index=items.findIndex(item=>item.key===targetKey);if(index>=0){first=Math.max(0,index-15);last=Math.min(items.length,index+25);}}
      const pinned=pins(),ranges=[{first,last}];for(const [index,item]of items.entries())if(pinned.has(item.key))ranges.push({first:index,last:index+1});
      ranges.sort((a,b)=>a.first-b.first);const windows=[];for(const range of ranges){const previous=windows.at(-1);if(previous&&range.first<=previous.last)previous.last=Math.max(previous.last,range.last);else windows.push({...range});}
      top.style.height=positions[windows[0].first]+'px';bottom.style.height=(positions[items.length]-positions[windows.at(-1).last])+'px';let gapIndex=0;const ordered=[top],mounted=[];
      // A distant focused/selected/playing row stays attached without mounting
      // every message between it and the visible window. Spacers retain layout.
      for(let rangeIndex=0;rangeIndex<windows.length;rangeIndex++){
        const range=windows[rangeIndex];if(rangeIndex){let gap=gaps[gapIndex];if(!gap){gap=document.createElement('div');gap.className='vh-timeline-spacer';gap.setAttribute('aria-hidden','true');gaps[gapIndex]=gap;}gap.style.height=(positions[range.first]-positions[windows[rangeIndex-1].last])+'px';ordered.push(gap);gapIndex++;}
        for(let i=range.first;i<range.last;i++){const node=make(items[i]);if(!node)continue;ordered.push(node);mounted.push(node);observer?.observe(node);}
      }ordered.push(bottom);
      // Remove stale rows before insertion, so they cannot force a retained
      // focused/selected message through insertBefore's disconnect/reconnect.
      // Gap spacers may move between sparse windows; message order stays stable.
      const keep=new Set(ordered);for(const child of [...feed.children])if(!keep.has(child)||gaps.includes(child)){observer?.unobserve(child);child.remove();}
      let cursor=feed.firstChild;for(const node of ordered){if(node!==cursor)feed.insertBefore(node,cursor);cursor=node.nextSibling;}
      for(const node of mounted){const measured=node.getBoundingClientRect?.().height;if(measured>0)heights.set(node.dataset.nativeKey,measured);}
      if(bottomAnchor)feed.scrollTop=feed.scrollHeight;else restore(saved);
      readingAnchor=anchor();
      const alive=new Set(items.map(item=>item.key));for(const [key,node]of nodes)if(!alive.has(key)){observer?.unobserve(node);nodes.delete(key);heights.delete(key);mediaState.delete(key);}
      for(const [key,node]of nodes){if(nodes.size<=MAX_CACHE)break;if(node.parentNode===feed||pinned.has(key))continue;const positions=[...(node.querySelectorAll?.('audio,video')||[])].map(media=>Number(media.currentTime)||0);if(positions.length)mediaState.set(key,positions);nodes.delete(key);}
      feed.dataset.windowed='true';feed.dataset.renderedRows=String(mounted.length);feed.dataset.totalRows=String(items.length);
    }
    const schedule=({resize=false}={})=>{if(destroyed)return;followResize=followResize||resize;if(frame)return;frame=requestAnimationFrame(()=>{frame=0;const resized=followResize;followResize=false;render({bottomAnchor:resized&&follow,savedAnchor:resized&&!follow?readingAnchor:null});});};
    const onScroll=()=>{follow=feed.scrollHeight-feed.clientHeight-feed.scrollTop<80;readingAnchor=anchor();schedule();};feed.addEventListener('scroll',onScroll,{passive:true});
    if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(entries=>{let changed=false;for(const entry of entries){const key=entry.target.dataset.nativeKey,value=entry.borderBoxSize?.[0]?.blockSize||entry.contentRect?.height;if(value>0&&Math.abs((heights.get(key)||ESTIMATE)-value)>1){heights.set(key,value);changed=true;}}if(changed)schedule({resize:true});});}
    return {update(next,{forceBottom=false}={}){items=next;render({bottomAnchor:forceBottom||follow});},jump(key,{align='center'}={}){render({targetKey:key,preserve:false});const node=nodes.get(key);node?.scrollIntoView?.({block:align});node?.focus?.({preventScroll:true});if(node){follow=feed.scrollHeight-feed.clientHeight-feed.scrollTop<80;readingAnchor=anchor();}schedule();return!!node;},latest(){follow=true;render({bottomAnchor:true,preserve:false});},refresh:schedule,stats:()=>({total:items.length,mounted:Number(feed.dataset.renderedRows)||0,cached:nodes.size}),destroy(){destroyed=true;observer?.disconnect();feed.removeEventListener('scroll',onScroll);if(frame&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(frame);nodes.clear();heights.clear();mediaState.clear();}};
  }
  window.VoidNativeTimeline=Object.freeze({update(feed,items,options){let controller=controllers.get(feed);if(!controller){controller=create(feed);controllers.set(feed,controller);}controller.update(items,options);return controller;},get:feed=>controllers.get(feed)});
})();
