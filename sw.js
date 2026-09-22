// Basit service worker: uygulama kabuğunu (index.html, ikonlar) önbelleğe alır,
// böylece bağlantı zayıfken de uygulama açılabilir. Veriler (siparişler, üretim
// kayıtları) her zaman Firestore'dan canlı çekilir, burada önbelleklenmez.
var CACHE = "montaj-defteri-shell-v1";
var SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }));
  self.skipWaiting();
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  // sadece kendi kabuk dosyalarımızı önbellekten karşıla; Firebase/Google
  // isteklerine ve diğer her şeye dokunma (ağdan gitsin)
  if(url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached) return cached;
      return fetch(e.request).catch(function(){ return caches.match("./index.html"); });
    })
  );
});
