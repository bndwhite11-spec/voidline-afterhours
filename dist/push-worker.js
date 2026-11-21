const safeNotificationPath=value=>typeof value==='string'&&value.length<=900&&/^#(?:messages\/|servers\/|you$|chats$|inbox$)/.test(value)&&!/[\u0000-\u001f\u007f]/.test(value)?value:'#chats';
/* Receives generic notifications only. No fetch handler or private-content cache. */
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()||{};}catch{}
 const path=safeNotificationPath(data.path);
 event.waitUntil(self.registration.showNotification('VOIDLINE',{body:data.body==='Notifications are connected.'?data.body:'You have new activity in VOIDLINE.',icon:'/icon.svg',badge:'/icon.svg',tag:typeof data.tag==='string'?data.tag.slice(0,100):'voidline-activity',data:{path}}));
});
async function openNotification(path){
 const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
 for(const client of windows){
  const url=new URL(client.url);
  const appPage=['/','/index.html','/chats','/chats/'].includes(url.pathname);
  if(url.origin!==self.location.origin||!appPage||url.search||url.hash!==path)continue;
  try{return await client.focus();}catch{ /* The matching tab closed during lookup. */ }
 }
 // A different tab may hold a draft, an upload or a recovery flow.
 return self.clients.openWindow('/'+path);
}
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil(openNotification(safeNotificationPath(event.notification.data?.path)));
});
