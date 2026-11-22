/* QLPM Push-only service worker.
 * Never intercepts student requests or caches grades, messages or passwords. */
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
 let content={};
 try{content=event.data?.json()||{}}catch{}
 const url=content.url==="/student-web?classroom=1"
  ?"/student-web?classroom=1":"/?classroom=1";
 const student=url.startsWith('/student-web');
 event.waitUntil(self.registration.showNotification(
  student?"QLPM Student":"QLPM Teacher",{
   body:typeof content.body==="string"&&content.body.length<130
    ?content.body:"Có thông báo mới từ lớp học",
   icon:"/favicon.svg",
   badge:"/favicon.svg",
   tag:student?"qlpm-student-classroom":"qlpm-teacher-chat",
   renotify:true,
   data:{url},
   silent:false
  }
 ));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const target=event.notification.data?.url==="/student-web?classroom=1"
  ?"/student-web?classroom=1":"/?classroom=1";
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const intendedPath=new URL(target,self.location.origin).pathname;
  for(const client of windows){
   if(new URL(client.url).pathname!==intendedPath)continue;
   await client.focus();
   client.postMessage({type:"qlpm-open-classroom"});
   return;
  }
  await self.clients.openWindow(target);
 })());
});
