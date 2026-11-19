/* Content-free authenticated hints. Existing authorized cursor reads provide messages. */
(() => {
  'use strict';
  // One random name per loaded page. The server keeps a single live-update
  // lease per tab, so switching conversations never uses up the account's slots.
  const tabId=(()=>{try{return crypto.randomUUID();}catch(_){return '';}})();
  function create({conversationId,channelId,clientId=tabId,onRevision=()=>{},onStatus=()=>{},onDenied=()=>{},poll=()=>{},EventSourceClass=window.EventSource,random=Math.random}){
    let source=null,timer=0,watchdog=0,stopped=false,failures=0,lastId='',lastRevision='',phase='idle',lastEvent=0;
    const status=(value,copy)=>{phase=value;onStatus({phase:value,copy,lastEvent});};
    const close=()=>{source?.close();source=null;clearTimeout(watchdog);};
    function fallback(){if(stopped||document.hidden)return;Promise.resolve(poll()).catch(()=>{});}
    function retry(copy){close();if(stopped)return;failures=Math.min(7,failures+1);status(navigator.onLine===false?'offline':'retrying',copy||'Live connection interrupted · checking for updates');fallback();clearTimeout(timer);timer=setTimeout(connect,Math.min(30000,700*2**failures)*(0.7+random()*.6));}
    function event(event){if(stopped||!source)return;let data;try{data=JSON.parse(event.data);}catch(_){retry('Live updates returned an unreadable event · checking for updates');return;}if(!data||typeof data!=='object')return;
      lastEvent=Date.now();failures=0;lastId=/^[0-9]{1,20}$/.test(event.lastEventId||'')?event.lastEventId:lastId;status('live','Live updates connected');clearTimeout(watchdog);watchdog=setTimeout(()=>retry('Live connection timed out · checking for updates'),20000);
      const revision=[data.accountRevision,data.conversationRevision,data.seq].map(value=>String(value??'')).join(':');if(revision!==lastRevision){lastRevision=revision;Promise.resolve(onRevision(data)).catch(()=>{});}
    }
    function connect(){clearTimeout(timer);if(stopped)return;if(document.hidden){close();status('paused','Updates paused while this tab is hidden');return;}if(navigator.onLine===false){status('offline','Offline · outgoing messages stay on this device');timer=setTimeout(connect,10000);return;}
      if(typeof EventSourceClass!=='function'){status('polling','Live streaming unavailable · checking for updates');fallback();timer=setTimeout(connect,10000);return;}
      close();status('connecting','Connecting live updates · polling remains available');const params=new URLSearchParams();if(conversationId)params.set('conversation',conversationId);if(channelId)params.set('channel',channelId);if(lastId)params.set('after',lastId);if(clientId)params.set('client',clientId);
      try{source=new EventSourceClass('/api/realtime?'+params,{withCredentials:true});const connection=source,receive=value=>{if(source===connection)event(value);};source.addEventListener('hello',receive);source.addEventListener('revision',receive);source.addEventListener('heartbeat',receive);source.addEventListener('restricted',()=>{if(source!==connection)return;close();status('denied','Live access ended · checking permissions');Promise.resolve(onDenied()).catch(()=>{});});source.addEventListener('unavailable',()=>{if(source===connection)retry();});source.addEventListener('renew',()=>{if(source!==connection)return;close();status('connecting','Renewing live update connection');timer=setTimeout(connect,150+random()*250);});source.onerror=()=>{if(source===connection)retry();};watchdog=setTimeout(()=>retry('Live streaming is unavailable · checking for updates'),12000);}catch(_){retry('Live streaming is unavailable · checking for updates');}
    }
    const visibility=()=>{if(document.hidden){close();clearTimeout(timer);status('paused','Updates paused while this tab is hidden');}else{fallback();connect();}},online=()=>{fallback();connect();},offline=()=>{close();status('offline','Offline · outgoing messages stay on this device');};
    document.addEventListener('visibilitychange',visibility);window.addEventListener('online',online);window.addEventListener('offline',offline);connect();
    return Object.freeze({state:()=>({phase,lastEvent,lastId}),refresh:connect,stop(){stopped=true;close();clearTimeout(timer);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('online',online);window.removeEventListener('offline',offline);status('closed','Updates disconnected');}});
  }
  window.VoidRealtime=Object.freeze({create});
})();
