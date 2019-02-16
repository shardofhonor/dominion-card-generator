importScripts('https://unpkg.com/workbox-sw@0.0.2/build/importScripts/workbox-sw.dev.v0.0.2.js');
importScripts('https://unpkg.com/workbox-runtime-caching@1.3.0/build/importScripts/workbox-runtime-caching.prod.v1.3.0.js');
importScripts('https://unpkg.com/workbox-routing@1.3.0/build/importScripts/workbox-routing.prod.v1.3.0.js');

const cardAssetsRoute = new workbox.routing.RegExpRoute({
    regExp: new RegExp('^https://shardofhonor.github.io/dominion-card-generator/card-resources/*'),
    handler: new workbox.runtimeCaching.CacheFirst()
});
const fontAssetsRoute = new workbox.routing.RegExpRoute({
    regExp: new RegExp('^https://shardofhonor.github.io/dominion-card-generator/fonts/*'),
    handler: new workbox.runtimeCaching.CacheFirst()
});
const faviconAssetsRoute = new workbox.routing.RegExpRoute({
    regExp: new RegExp('^https://shardofhonor.github.io/dominion-card-generator/favicon/*'),
    handler: new workbox.runtimeCaching.CacheFirst()
});
const otherAssetsRoute = new workbox.routing.RegExpRoute({
    regExp: new RegExp('^https://shardofhonor.github.io/dominion-card-generator/assets/*'),
    handler: new workbox.runtimeCaching.CacheFirst()
});

const router = new workbox.routing.Router();
router.registerRoutes({
    routes: [cardAssetsRoute, fontAssetsRoute, faviconAssetsRoute, otherAssetsRoute]
});
router.setDefaultHandler({
    handler: new workbox.runtimeCaching.CacheFirst()
});
