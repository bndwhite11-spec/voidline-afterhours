const safeNotificationPath=value=>typeof value==='string'&&value.length<=900&&/^#(?:messages\/|servers\/|you$|chats$|inbox$)/.test(value)&&!/[\u0000-\u001f\u007f]/.test(value)?value:'#chats';
/* Receives generic notifications only. No fetch handler or private-content cache. */
self.addEventListener('push',event=>{
 let data={};try{data=event.data?.json()||{};}catch{}
 const path=safeNotificationPath(data.path);
 event.waitUntil(self.registration.showNotification('VOIDLINE',{body:data.body==='Notifications are connected.'?data.body:'You have new activity in VOIDLINE.',icon:'/icon.svg',badge:'/icon.svg',tag:typeof data.tag==='string'?data.tag.slice(0,100):'voidline-activity',data:{path}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();const path=safeNotificationPath(event.notification.data?.path);
 event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows){const url=new URL(client.url);if(url.origin===self.location.origin){await client.navigate('/'+path);return client.focus();}}return self.clients.openWindow('/'+path);})());
});
