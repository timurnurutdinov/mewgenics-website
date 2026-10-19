const CACHE='catbook-day169-v13';
const FILES=['./','./index.html','./style.css','./core.js','./app.js','./data.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const response=await fetch('./icon-paths.json',{cache:'reload'});
  if(!response.ok)throw Error('Icon manifest unavailable');
  const icons=await response.json();
  const portraitsResponse=await fetch('./portrait-paths.json',{cache:'reload'});
  if(!portraitsResponse.ok)throw Error('Portrait manifest unavailable');
  const portraits=await portraitsResponse.json();
  const cache=await caches.open(CACHE);
  await cache.addAll([...FILES,'./icon-paths.json','./portrait-paths.json',...[...icons,...portraits].map(p=>'./'+p)]);
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('catbook-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==location.origin)return;
  event.respondWith(fetch(event.request).catch(()=>caches.match(event.request).then(cached=>cached||(event.request.mode==='navigate'?caches.match('./index.html'):Response.error()))));
});
