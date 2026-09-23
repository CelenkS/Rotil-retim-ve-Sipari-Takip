// Basit service worker: uygulama kabuğunu (index.html, ikonlar) önbelleğe alır,
// böylece bağlantı zayıfken de uygulama açılabilir. Veriler (siparişler, üretim
// kayıtları) her zaman Firestore'dan canlı çekilir, burada önbelleklenmez.
//
// index.html için "önce ağ" (network-first) stratejisi kullanılır: internet
// varsa her zaman en güncel sürüm indirilir ve önbelleğe yazılır; internet
// yoksa (veya istek başarısız olursa) önbellekteki en son bilinen sürüm
// gösterilir. Böylece yeni bir yayın yapıldığında kullanıcı bir dahaki
// açılışta otomatik günceli görür, eski sürümde takılı kalmaz.
var CACHE = "montaj-defteri-shell-v3";
var SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }));
  self.skipWaiting();
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

function isShellPage(req,url){
  return req.mode === "navigate" || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/");
}

self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  // sadece kendi kabuk dosyalarımızı önbellekten karşıla; Firebase/Google
  // isteklerine ve diğer her şeye dokunma (ağdan gitsin)
  if(url.origin !== location.origin) return;

  if(isShellPage(e.request,url)){
    e.respondWith(
      fetch(e.request).then(function(res){
        var copy=res.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request,copy); });
        return res;
      }).catch(function(){
        return caches.match(e.request).then(function(c){ return c || caches.match("./index.html"); });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(cached){
      if(cached) return cached;
      return fetch(e.request).catch(function(){ return caches.match("./index.html"); });
    })
  );
});
