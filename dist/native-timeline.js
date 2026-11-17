/* Variable-height timeline window. Offscreen rows are detached, with measured spacers. */
(() => {
  'use strict';
  const controllers=new WeakMap(),ESTIMATE=88,OVERSCAN=700,MAX_CACHE=500;
  function create(feed){
    const heights=new Map(),nodes=new Map(),mediaState=new Map();let items=[],frame=0,observer=null,destroyed=false,follow=true;
    // Recycling earlier rows must not announce them as newly received messages.
    // The messenger announces actual incoming cursor updates separately.
    feed.setAttribute('aria-live','off');
    const top=document.createElement('div'),bottom=document.createElement('div');for(const node of[top,bottom]){node.className='vh-timeline-spacer';node.setAttribute('aria-hidden','true');}
    const height=item=>heights.get(item.key)||ESTIMATE;
    const offsets=()=>{const result=[0];for(const item of items)result.push(result[result.length-1]+height(item));return result;};
    function pins(){const result=new Set(),selected=window.getSelection?.();for(const [key,node]of nodes){if(node.contains?.(document.activeElement)||(selected&&!selected.isCollapsed&&(node.contains?.(selected.anchorNode)||node.contains?.(selected.focusNode)))||[...(node.querySelectorAll?.('audio,video')||[])].some(media=>!media.paused))result.add(key);}return result;}
    function anchor(){if(!feed.getBoundingClientRect)return null;const top=feed.getBoundingClientRect().top;for(const child of feed.children||[]){if(!child.dataset?.nativeKey||!child.getBoundingClientRect)continue;const rect=child.getBoundingClientRect();if(rect.bottom>top)return{key:child.dataset.nativeKey,offset:rect.top-top};}return null;}
    function restore(saved){if(!saved)return;const node=nodes.get(saved.key);if(node?.parentNode===feed&&node.getBoundingClientRect)feed.scrollTop+=node.getBoundingClientRect().top-feed.getBoundingClientRect().top-saved.offset;}
    function make(item){let node=nodes.get(item.key);if(!node||node.__voidlineHTML!==item.html){const template=document.createElement('template');template.innerHTML=item.html;const fresh=template.content?.firstElementChild;if(!fresh)return null;if(node&&node.tagName===fresh.tagName){const focused=node.contains?.(document.activeElement)?document.activeElement:null,focus=focused?.dataset?{...focused.dataset}:null,open=!!node.querySelector?.('details[open]'),media=node.querySelector?.('.vh-message-attachments'),nextMedia=fresh.querySelector?.('.vh-message-attachments');if(media&&nextMedia&&media.outerHTML===nextMedia.outerHTML)nextMedia.replaceWith(media);node.className=fresh.className;node.replaceChildren(...fresh.childNodes);for(const attribute of fresh.attributes)node.setAttribute(attribute.name,attribute.value);if(open){const menu=node.querySelector('details');if(menu)menu.open=true;}if(focus){const replacement=[...node.querySelectorAll('button')].find(button=>button.dataset.nativeAction===focus.nativeAction&&button.dataset.event===focus.event&&button.dataset.emoji===focus.emoji);(replacement||node).focus({preventScroll:true});}}
      else node=fresh;node.__voidlineHTML=item.html;nodes.set(item.key,node);const saved=mediaState.get(item.key);if(saved)for(const [index,media]of [...node.querySelectorAll('audio,video')].entries()){const position=saved[index];if(position!==undefined){if(media.readyState)media.currentTime=position;else media.addEventListener('loadedmetadata',()=>{media.currentTime=position;},{once:true});}}}return node;}
    function render({targetKey,bottomAnchor=false,preserve=true}={}){
      if(destroyed)return;const saved=preserve?anchor():null,positions=offsets(),savedIndex=saved?items.findIndex(item=>item.key===saved.key):-1,scroll=Math.max(0,savedIndex>=0?positions[savedIndex]-saved.offset:feed.scrollTop),viewport=Math.max(300,feed.clientHeight||600);let first=0,last=items.length;
      while(first<items.length&&positions[first+1]<scroll-OVERSCAN)first++;
      last=first;while(last<items.length&&positions[last]<scroll+viewport+OVERSCAN)last++;
      if(bottomAnchor){last=items.length;first=last;while(first>0&&positions[last]-positions[first]<viewport+OVERSCAN)first--;if(first===last)first=Math.max(0,last-30);}
      if(targetKey){const index=items.findIndex(item=>item.key===targetKey);if(index>=0){first=Math.max(0,index-15);last=Math.min(items.length,index+25);}}
      const pinned=pins();for(const [index,item]of items.entries())if(pinned.has(item.key)){first=Math.min(first,index);last=Math.max(last,index+1);}
      top.style.height=positions[first]+'px';bottom.style.height=(positions[items.length]-positions[last])+'px';let cursor=feed.firstChild;const keep=new Set([top,bottom]),mounted=[];
      function insert(node){if(node!==cursor)feed.insertBefore(node,cursor);cursor=node.nextSibling;keep.add(node);}
      insert(top);for(let i=first;i<last;i++){const node=make(items[i]);if(!node)continue;insert(node);mounted.push(node);observer?.observe(node);}insert(bottom);
      for(const child of [...feed.children])if(!keep.has(child)){observer?.unobserve(child);child.remove();}
      for(const node of mounted){const measured=node.getBoundingClientRect?.().height;if(measured>0)heights.set(node.dataset.nativeKey,measured);}
      if(bottomAnchor)feed.scrollTop=feed.scrollHeight;else restore(saved);
      const alive=new Set(items.map(item=>item.key));for(const [key,node]of nodes)if(!alive.has(key)){observer?.unobserve(node);nodes.delete(key);heights.delete(key);mediaState.delete(key);}
      for(const [key,node]of nodes){if(nodes.size<=MAX_CACHE)break;if(node.parentNode===feed||pinned.has(key))continue;const positions=[...(node.querySelectorAll?.('audio,video')||[])].map(media=>Number(media.currentTime)||0);if(positions.length)mediaState.set(key,positions);nodes.delete(key);}
      feed.dataset.windowed='true';feed.dataset.renderedRows=String(last-first);feed.dataset.totalRows=String(items.length);
    }
    const schedule=()=>{if(frame||destroyed)return;frame=requestAnimationFrame(()=>{frame=0;render();});};
    const onScroll=()=>{follow=feed.scrollHeight-feed.clientHeight-feed.scrollTop<80;schedule();};feed.addEventListener('scroll',onScroll,{passive:true});
    if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(entries=>{let changed=false;for(const entry of entries){const key=entry.target.dataset.nativeKey,value=entry.borderBoxSize?.[0]?.blockSize||entry.contentRect?.height;if(value>0&&Math.abs((heights.get(key)||ESTIMATE)-value)>1){heights.set(key,value);changed=true;}}if(changed)schedule();});}
    return {update(next,{forceBottom=false}={}){items=next;render({bottomAnchor:forceBottom||follow});},jump(key,{align='center'}={}){render({targetKey:key,preserve:false});const node=nodes.get(key);node?.scrollIntoView?.({block:align});node?.focus?.({preventScroll:true});schedule();return!!node;},latest(){follow=true;render({bottomAnchor:true,preserve:false});},refresh:schedule,stats:()=>({total:items.length,mounted:Number(feed.dataset.renderedRows)||0,cached:nodes.size}),destroy(){destroyed=true;observer?.disconnect();feed.removeEventListener('scroll',onScroll);if(frame&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(frame);nodes.clear();heights.clear();mediaState.clear();}};
  }
  window.VoidNativeTimeline=Object.freeze({update(feed,items,options){let controller=controllers.get(feed);if(!controller){controller=create(feed);controllers.set(feed,controller);}controller.update(items,options);return controller;},get:feed=>controllers.get(feed)});
})();
