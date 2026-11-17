/* Tab-local navigation and drafts. Session storage survives refresh and does
   not broadcast destinations or composer content to other tabs. Media is kept
   once per immutable value, separate from frequently updated text metadata. */
(() => {
 'use strict';
 const KEY='voidline.tab.v1',MEDIA=KEY+'.media.';
 const copy=value=>JSON.parse(JSON.stringify(value));
 const safeMap=value=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).filter(([key])=>!['__proto__','constructor','prototype'].includes(key))):{};
 function clean(value={}){
  if(!value||typeof value!=='object')value={};const location=value.location;
  return {version:1,location:location&&typeof location.server==='string'&&typeof location.channel==='string'?{server:location.server.slice(0,100),channel:location.channel.slice(0,100)}:null,drafts:safeMap(value.drafts),threads:safeMap(value.threads),reading:safeMap(value.reading),thread:typeof value.thread==='string'?value.thread.slice(0,100):''};
 }
 function create(storage){
  let memory=clean(),serialized='',sequence=0;const references=new Map();
  return {
   load(){try{serialized=storage?.getItem(KEY)||'';memory=clean(JSON.parse(serialized||'{}'));for(const [key,draft]of Object.entries(memory.drafts)){const value={...draft};for(const type of ['image','audio'])if(value[type+'Ref']){const ref=value[type+'Ref'];value[type]=storage.getItem(MEDIA+ref)||'';if(value[type])references.set(value[type],ref);else value.attachmentMissing=true;delete value[type+'Ref'];}memory.drafts[key]=value;}}catch(_){}return copy(memory);},
   save(value){
    memory=clean(value);const written=[];
    try{
     if(!storage)throw Error('Session storage unavailable');const used=new Set(),record={...memory,drafts:{}};
     for(const [key,draft]of Object.entries(memory.drafts)){
      const metadata={...draft};
      for(const type of ['image','audio'])if(typeof metadata[type]==='string'&&metadata[type]){
       const bytes=metadata[type];let ref=references.get(bytes);
       if(!ref){ref=Date.now().toString(36)+'-'+(++sequence)+'-'+Math.random().toString(36).slice(2,8);storage.setItem(MEDIA+ref,bytes);references.set(bytes,ref);written.push({ref,bytes});}
       used.add(ref);metadata[type+'Ref']=ref;delete metadata[type];
      }
      record.drafts[key]=metadata;
     }
     const text=JSON.stringify(record);if(text!==serialized||storage.getItem(KEY)!==text){storage.setItem(KEY,text);serialized=text;}
     // Delete obsolete media only after the referencing metadata commits.
     const garbage=[];for(let index=0;index<storage.length;index++){const key=storage.key(index);if(key?.startsWith(MEDIA)&&!used.has(key.slice(MEDIA.length)))garbage.push(key);}
     for(const key of garbage){try{storage.removeItem(key);}catch(_){}}for(const [bytes,ref]of references)if(!used.has(ref))references.delete(bytes);
     return true;
    }catch(_){for(const {ref,bytes}of written){try{storage.removeItem(MEDIA+ref);}catch(_){}references.delete(bytes);}return false;}
   },
   get current(){return copy(memory);},key:KEY
  };
 }
 window.VoidDrafts={create,clean};
})();
