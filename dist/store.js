/* Durable local operation journal. A successful mutation is one atomic setItem;
   independent tabs never overwrite the same operation key. No media checkpoint
   is rewritten on every action. Legacy archive is retained for recovery. */
(() => {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const objects = (list, id = 'id') => Object.fromEntries((list || []).map(item => [item[id], item]));
  function encode(state) {
    const value = copy(state);
    value.messages = Object.fromEntries(Object.entries(value.messages || {}).map(([key, list]) => [key, objects(list)]));
    value.customServers = objects(value.customServers);
    Object.values(value.customServers).forEach(server => {server.channels = Object.fromEntries((server.channels || []).map(([id, description], order) => [id, {description, order}]));});
    value.conversations = objects(value.conversations);
    value.notifications = objects(value.notifications);
    for (const field of ['friends','deleted','artifactInspected']) value[field] = Object.fromEntries((value[field] || []).map(id => [id, true]));
    return value;
  }
  function decode(encoded) {
    const value = copy(encoded);
    value.messages = Object.fromEntries(Object.entries(value.messages || {}).map(([key, records]) => [key, Object.values(records).filter(m => m && m.id).sort((a,b) => a.time-b.time || a.id.localeCompare(b.id))]));
    value.customServers = Object.values(value.customServers || {});
    value.customServers.forEach(server => {server.channels = Object.entries(server.channels || {}).sort((a,b) => (a[1].order||0)-(b[1].order||0)||a[0].localeCompare(b[0])).map(([id, c]) => [id, c.description || '']);});
    value.conversations = Object.values(value.conversations || {});
    value.notifications = Object.values(value.notifications || {}).sort((a,b) => a.time-b.time);
    for(const field of ['friends','deleted','artifactInspected'])value[field] = Object.keys(value[field] || {}).filter(id => value[field][id]);
    const deleted = new Set(value.deleted);
    Object.keys(value.messages).forEach(key => {value.messages[key] = value.messages[key].filter(m => !deleted.has(m.id));});
    return value;
  }
  function flatten(value, path = [], result = new Map()) {
    if(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length) {
      Object.entries(value).forEach(([key, child]) => flatten(child, [...path,key], result));
    } else result.set(JSON.stringify(path), value);
    return result;
  }
  function set(root, path, value, remove) {
    if(!path.length)return;
    let at = root;
    for(let i=0;i<path.length-1;i++){const key=path[i];if(['__proto__','constructor','prototype'].includes(key))throw Error('Invalid archive path');if(!at[key] || typeof at[key] !== 'object' || Array.isArray(at[key]))at[key]={};at=at[key];}
    const key=path[path.length-1];if(['__proto__','constructor','prototype'].includes(key))throw Error('Invalid archive path');if(remove)delete at[key];else at[key]=copy(value);
  }
  function create(storage, legacyKey='voidline.local.v1') {
    const prefix='voidline.archive.v3.', baseKey=prefix+'base', opPrefix=prefix+'op.';
    const writer=globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)+Date.now();
    let sequence=0, clock=0, baseline=new Map(), latest={};
    const legacy=()=>JSON.parse(storage.getItem(legacyKey)||'{}');
    let cacheBase=null,cacheEncoded=null,seen=new Set(),revisions=new Map();
    function read() {
      const base=storage.getItem(baseKey),rawBase=base===null?storage.getItem(legacyKey)||'{}':base;
      const keys=[];for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key?.startsWith(opPrefix))keys.push(key);}
      if(cacheBase!==rawBase||!cacheEncoded||keys.length<seen.size){cacheBase=rawBase;cacheEncoded=encode(JSON.parse(rawBase));seen=new Set();revisions=new Map();}
      const operations=[];
      for(const key of keys)if(!seen.has(key)){const op=JSON.parse(storage.getItem(key));if(!op||op.schema!==3||!Number.isFinite(op.clock)||!Array.isArray(op.changes))throw Error('Invalid operation journal');operations.push({key,op});}
      operations.sort((a,b)=>a.op.clock-b.op.clock||a.op.id.localeCompare(b.op.id));
      for(const {key,op}of operations){clock=Math.max(clock,op.clock);for(const patch of op.changes){const path=JSON.stringify(patch.path),revision=revisions.get(path);if(!revision||op.clock>revision.clock||(op.clock===revision.clock&&op.id>revision.id)){set(cacheEncoded,patch.path,patch.value,patch.remove);revisions.set(path,{clock:op.clock,id:op.id});}}seen.add(key);}
      return decode(cacheEncoded);
    }
    function load(fallback={}) {
      latest=read();if(!Object.keys(latest).length)latest=copy(fallback);
      baseline=flatten(cacheEncoded||encode(latest));return copy(latest);
    }
    function commit(candidate) {
      let changesForRetry=[];
      try {
        const target=flatten(encode(candidate)),changes=[];
        for(const [key,value]of target){if(!baseline.has(key)||JSON.stringify(baseline.get(key))!==JSON.stringify(value))changes.push({path:JSON.parse(key),value});}
        for(const key of baseline.keys())if(!target.has(key))changes.push({path:JSON.parse(key),remove:true});
        // Location/read-position paths from older archives are migration hints only.
        // They never become new shared operations; active navigation belongs to sessionStorage.
        // Empty container markers must never erase an entity added by another tab.
        const actual=changes.filter(p=>!['server','channel','readingPositions'].includes(p.path[0])).filter(p=>!(p.remove && baseline.get(JSON.stringify(p.path)) && typeof baseline.get(JSON.stringify(p.path))==='object' && !Array.isArray(baseline.get(JSON.stringify(p.path))) && !Object.keys(baseline.get(JSON.stringify(p.path))).length)).filter(p=>!(p.value && typeof p.value==='object' && !Array.isArray(p.value) && !Object.keys(p.value).length));
        changesForRetry=actual;const current=read();
        if(!storage.getItem(baseKey))storage.setItem(baseKey,JSON.stringify(current));
        if(actual.length){const id=writer+'-'+(++sequence);const op={schema:3,id,clock:Math.max(Date.now(),clock+1),changes:actual};storage.setItem(opPrefix+id,JSON.stringify(op));clock=op.clock;}
        latest=read();baseline=flatten(cacheEncoded||encode(latest));return {ok:true,state:copy(latest)};
      } catch(error) {return {ok:false,error:String(error?.message||error),state:copy(latest),patch:changesForRetry};}
    }
    function retry(changes){try{const current=read();if(!storage.getItem(baseKey))storage.setItem(baseKey,JSON.stringify(current));const id=writer+'-'+(++sequence);const op={schema:3,id,clock:Math.max(Date.now(),clock+1),changes};storage.setItem(opPrefix+id,JSON.stringify(op));clock=op.clock;latest=read();baseline=flatten(cacheEncoded||encode(latest));return {ok:true,state:copy(latest)};}catch(error){return{ok:false,error:String(error?.message||error)};}}
    return {load,commit,retry,read,keys:{baseKey,opPrefix},get committed(){return copy(latest);}};
  }
  window.VoidStore={create,recover(data){let encoded=encode(data.state||JSON.parse(data.legacyArchive||'{}'));for(const item of data.pending||[])for(const patch of item.patch||[])set(encoded,patch.path,patch.value,patch.remove);return decode(encoded);}};
})();
