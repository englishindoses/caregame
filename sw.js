const CACHE_NAME = 'tcm-v5';

const ASSETS = [
    './',
    './main.js',
    './data/items.js',
    './data/characters.js',
    './data/phrases.js',
    './data/minigames.js',
    './scenes/BootScene.js',
    './scenes/SelectScene.js',
    './scenes/PlayScene.js',
    './scenes/MiniGameSelectScene.js',
    './scenes/CatchScene.js',
    './scenes/TidyScene.js',
    './manifest.json',

    // Images – WebP (background + all characters)
    './assets/images/bg_room.webp',
    './assets/images/dolly_neutral.webp',
    './assets/images/dolly_needy.webp',
    './assets/images/dolly_happy.webp',
    './assets/images/dolly_sleepy.webp',
    './assets/images/dolly_sleeping.webp',
    './assets/images/dolly_jumping.webp',
    './assets/images/giraffe_neutral.webp',
    './assets/images/giraffe_needy.webp',
    './assets/images/giraffe_happy.webp',
    './assets/images/giraffe_sleepy.webp',
    './assets/images/giraffe_sleeping.webp',
    './assets/images/giraffe_jumping.webp',
    './assets/images/bunny_neutral.webp',
    './assets/images/bunny_needy.webp',
    './assets/images/bunny_happy.webp',
    './assets/images/bunny_sleepy.webp',
    './assets/images/bunny_sleeping.webp',
    './assets/images/bunny_jumping.webp',
    './assets/images/item_apple.webp',

    // Images – PNG (items)
    './assets/images/item_yogurt.png',
    './assets/images/item_banana.png',
    './assets/images/item_sandwich.png',
    './assets/images/item_biscuit.png',
    './assets/images/item_water.png',
    './assets/images/item_milk.png',
    './assets/images/item_juice.png',
    './assets/images/item_blanket.png',
    './assets/images/item_pillow.png',
    './assets/images/item_teddy.png',
    './assets/images/item_book.png',
    './assets/images/item_ball.png',
    './assets/images/item_blocks.png',
    './assets/images/item_car.png',

    // Audio – requests
    './assets/audio/request_yogurt.mp3',
    './assets/audio/request_banana.mp3',
    './assets/audio/request_apple.mp3',
    './assets/audio/request_sandwich.mp3',
    './assets/audio/request_biscuit.mp3',
    './assets/audio/request_water.mp3',
    './assets/audio/request_milk.mp3',
    './assets/audio/request_juice.mp3',
    './assets/audio/request_blanket.mp3',
    './assets/audio/request_pillow.mp3',
    './assets/audio/request_teddy.mp3',
    './assets/audio/request_book.mp3',
    './assets/audio/request_ball.mp3',
    './assets/audio/request_blocks.mp3',
    './assets/audio/request_car.mp3',

    // Audio – thank-yous
    './assets/audio/thank_you_1.mp3',
    './assets/audio/thank_you_2.mp3',
    './assets/audio/thank_you_3.mp3',
    './assets/audio/thank_you_5.mp3',
    './assets/audio/thank_you_food_1.mp3',
    './assets/audio/thank_you_food_2.mp3',
    './assets/audio/thank_you_food_3.mp3',
    './assets/audio/thank_you_food_4.mp3',
    './assets/audio/thank_you_comfy_1.mp3',
    './assets/audio/thank_you_comfy_2.mp3',
    './assets/audio/thank_you_comfy_3.mp3',
    './assets/audio/thank_you_toys_1.mp3',

    // Audio – feedback and misc
    './assets/audio/wrong_1.mp3',
    './assets/audio/wrong_2.mp3',
    './assets/audio/wrong_3.mp3',
    './assets/audio/wrong_4.mp3',
    './assets/audio/sleepy_1.mp3',
    './assets/audio/sleepy_2.mp3',
    './assets/audio/sleepy_3.mp3',
    './assets/audio/all_done.mp3',
    './assets/audio/chosen.mp3',
    './assets/audio/chosen_2.mp3',
    './assets/audio/chosen_3.mp3',

    // Mini-game assets — add these (and bump CACHE_NAME) once the files exist.
    // cache.addAll() rejects the whole install if any file 404s, so they are
    // intentionally left out until recorded:
    //   Catch: play_invite_1..3, play_catch_1..2, catch_excite_1..3,
    //          player_catch_1..3, play_tired_1..3, boing
    //   Tidy:  tidy_chosen_1..2, tidy_opening_1..2, tidy_name_{ball,book,blocks,car,teddy},
    //          in_it_goes_1..3, next_one_1..2, tidy_oops_1..2, all_tidy_1..2, plop,
    //          and the image mini_toybox
];

const PHASER_CDN = 'https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js';

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            await cache.addAll(ASSETS);
            try {
                const res = await fetch(PHASER_CDN, { mode: 'no-cors' });
                await cache.put(PHASER_CDN, res);
            } catch {
                // Phaser CDN unreachable at install time — will load from network on first play
            }
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// Code (HTML + JS) is served network-first so updates appear immediately when
// online, with the cache as an offline fallback. Images and audio are served
// cache-first (fast, and they only change when CACHE_NAME is bumped).
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const url    = new URL(event.request.url);
    const isCode = event.request.mode === 'navigate' || /\.(?:js|html)$/.test(url.pathname);

    if (isCode) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (response && response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
    } else {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    if (response && response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                    }
                    return response;
                });
            })
        );
    }
});
