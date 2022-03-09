// Names of the caches used in this version of the service worker.
// Increase chache number when you update any of the local resources, which will in turn trigger the install event again.
const PRECACHE_CORE = 'precache-core-v20';
const PRECACHE_CARD = 'precache-card-v3';
const RUNTIME = 'runtime';

// A list of local resources we always want to be cached.
const OFFLINE_URL = './';
const PRECACHE_CORE_URLS = [
  'index.html',
  'style.css',
  'fonts.css',
  'main.js',
  'favicon/favicon.ico',
  'favicon/site.webmanifest',
  'assets/icon-download.png',
  'assets/icon-upload.png',
  'assets/icon-sort.png',
  'assets/icon-favorites.png',
  'assets/icon-share.png',
  'assets/icon-settings.png',
  'assets/icon-close.png',
  'assets/icon-delete.png',
  'assets/icon-switch.png',
  'assets/icon-upload-image.png',
  'assets/spear-left.png',
  'assets/spear-right.png',
  'assets/spinner.png',
  OFFLINE_URL
];
const PRECACHE_CARD_URLS = [
  'card-resources/BaseCardBrown.png',
  'card-resources/BaseCardColorOne.png',
  'card-resources/BaseCardGray.png',
  'card-resources/BaseCardIcon.png',
  'card-resources/CardBrown.png',
  'card-resources/CardColorOne.png',
  'card-resources/CardColorTwo.png',
  'card-resources/CardColorThree.png',
  'card-resources/CardColorTwoNight.png',
  'card-resources/CardColorTwoBig.png',
  'card-resources/CardColorTwoSmall.png',
  'card-resources/CardGray.png',
  'card-resources/CardPortraitIcon.png',
  'card-resources/DoubleColorOne.png',
  'card-resources/DoubleUncoloredDetails.png',
  'card-resources/EventBrown.png',
  'card-resources/EventBrown2.png',
  'card-resources/EventColorOne.png',
  'card-resources/EventColorTwo.png',
  'card-resources/EventHeirloom.png',
  'card-resources/Heirloom.png',
  'card-resources/DescriptionFocus.png',
  'card-resources/MatBannerBottom.png',
  'card-resources/MatBannerTop.png',
  'card-resources/MatIcon.png',
  'card-resources/PileMarkerColorOne.png',
  'card-resources/PileMarkerGrey.png',
  'card-resources/PileMarkerIcon.png',
  'card-resources/Coin.png',
  'card-resources/Debt.png',
  'card-resources/Potion.png',
  'card-resources/VP.png',
  'card-resources/VP-Token.png',
  'card-resources/Traveller.png'
];

// The install handler takes care of precaching the resources we always need.
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(PRECACHE_CORE)
        .then(cache => cache.addAll(PRECACHE_CORE_URLS))
        .then(self.skipWaiting())
    );
    event.waitUntil(
        caches.open(PRECACHE_CARD)
        .then(cache => cache.addAll(PRECACHE_CARD_URLS))
        .then(self.skipWaiting())
    );
});

// The activate handler takes care of cleaning up old caches.
self.addEventListener('activate', event => {
    const currentCaches = [PRECACHE_CORE, PRECACHE_CARD, RUNTIME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return cacheNames.filter(cacheName => !currentCaches.includes(cacheName));
        }).then(cachesToDelete => {
            return Promise.all(cachesToDelete.map(cacheToDelete => {
                return caches.delete(cacheToDelete);
            }));
        }).then(() => self.clients.claim())
    );
});

// The fetch handler serves responses for same-origin resources from a cache.
// If no response is found, it populates the runtime cache with the response
// from the network before returning it to the page.
self.addEventListener('fetch', event => {
    // Skip cross-origin requests, like those for Google Analytics.
    if (event.request.url.startsWith(self.location.origin)) {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return caches.open(RUNTIME).then(cache => {
                    return fetch(event.request).then(response => {
                        // Put a copy of the response in the runtime cache.
                        if (event.request.url.startsWith('https://shardofhonor.github.io/dominion-card-generator/?') ||
                            event.request.url.startsWith('https://shardofhonor.github.io/dominion-card-generator/index.html?')) {
                            // do not cache these, because they are redundant
                            return response;
                        } else {
                            return cache.put(event.request, response.clone()).then(() => {
                                console.debug('Updated URL in runtime cache', event.request.url);
                                return response;
                            });
                        }
                    }).catch(error => {
                        console.warn('Returning offline page instead of', event.request.url, error);
                        return caches.match(OFFLINE_URL);
                    });
                });

            })
        );
    }
});
