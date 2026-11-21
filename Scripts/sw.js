const CACHE_VERSION = 'lvos-v1';
const STATIC_CACHE = 'lvos-static-' + CACHE_VERSION;
const PAGE_CACHE = 'lvos-pages-' + CACHE_VERSION;
const YEAR_IN_SECONDS = 31536000;

const precacheUrls = [
	'./',
	'./index.html',
	'./manifest.json',
	'./icon-192.png',
	'./icon-512.png',
	'./Styles/windows.css',
	'./Styles/ProvisionedApps.css',
	'./Styles/desktop.css',
	'./Styles/general.css',
	'./Styles/themes.css',
	'./Styles/Mica.css',
	'./Scripts/Launchpad.js',
	'./Scripts/WindowManager.js',
	'./Scripts/LegacyPolyfills.js',
	'./Scripts/Settings.js',
	'./Scripts/DesktopManager.js',
	'./Scripts/ProvisionedApps.js',
	'./Scripts/FileSystem.js',
	'./Scripts/Console.js',
	'./Scripts/physics.js',
	'./Scripts/youtube.js',
	'./Scripts/Messenger.js',
	'./Scripts/NewtonVirus.js',
	'./Scripts/index.js'
];

const staticRoutePatterns = [
	'/Styles/*',
	'/Scripts/*',
	'/Assets/*',
	'/Applications/*',
	'/**/*.css',
	'/**/*.js',
	'/**/*.mjs',
	'/**/*.json',
	'/**/*.png',
	'/**/*.jpg',
	'/**/*.jpeg',
	'/**/*.gif',
	'/**/*.svg',
	'/**/*.webp',
	'/**/*.avif',
	'/**/*.ico',
	'/**/*.woff',
	'/**/*.woff2',
	'/**/*.ttf',
	'/**/*.otf',
	'/**/*.mp3',
	'/**/*.ogg',
	'/**/*.wav',
	'/**/*.mp4',
	'/**/*.webm'
];

function isStaticAsset(url) {
	return url.pathname.includes('/Styles/') ||
		url.pathname.includes('/Scripts/') ||
		url.pathname.includes('/Assets/') ||
		url.pathname.includes('/Applications/') ||
		/\.(css|js|mjs|json|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|mp3|ogg|wav|mp4|webm)(\?.*)?$/i.test(url.pathname);
}

function immutableResponse(response) {
	var headers = new Headers(response.headers);
	headers.set('Cache-Control', 'public, max-age=' + YEAR_IN_SECONDS + ', immutable');
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: headers
	});
}

async function staleWhileRevalidate(request) {
	var cache = await caches.open(STATIC_CACHE);
	var cached = await cache.match(request);
	var fetchPromise = fetch(request).then(function (response) {
		if (response.ok) {
			cache.put(request, response.clone());
		}
		return response;
	}).catch(function () {
		return cached;
	});
	if (cached) {
		return immutableResponse(cached);
	}
	return fetchPromise;
}

async function networkFirst(request, preload) {
	var cache = await caches.open(PAGE_CACHE);
	try {
		var response = null;
		if (preload) {
			try { response = await preload; } catch (error) {}
		}
		if (!response) response = await fetch(request);
		if (response.ok) {
			await cache.put(request, response.clone());
		}
		return response;
	} catch (error) {
		var cached = await cache.match(request);
		if (cached) {
			return cached;
		}
		var staticCache = await caches.open(STATIC_CACHE);
		var index = await staticCache.match('./index.html');
		return index || Response.error();
	}
}

self.addEventListener('install', function (event) {
	var installEvent = /** @type {any} */ (event);
	installEvent.waitUntil(caches.open(STATIC_CACHE).then(function (cache) {
		return Promise.allSettled(precacheUrls.map(function (url) {
			return cache.add(url);
		}));
	}));
	if (typeof installEvent.addRoutes === 'function') {
		installEvent.waitUntil(installEvent.addRoutes(staticRoutePatterns.map(function (pattern) {
			return {
				condition: {
					urlPattern: pattern,
					requestMethod: 'get',
					runningStatus: 'not-running'
				},
				source: { cacheName: STATIC_CACHE }
			};
		})).catch(function (error) {
			console.warn('Static route registration failed:', error);
		}));
	}
	/** @type {any} */ (self).skipWaiting();
});

self.addEventListener('activate', function (event) {
	var activateEvent = /** @type {any} */ (event);
	var scope = /** @type {any} */ (self);
	activateEvent.waitUntil((async function () {
		var preload = scope.registration.navigationPreload;
		if (preload && typeof preload.enable === 'function') {
			try { await preload.enable(); }
			catch (error) { console.warn('Navigation preload enable failed:', error); }
		}
		await caches.keys().then(function (keys) {
			return Promise.all(keys.filter(function (key) {
				return key !== STATIC_CACHE && key !== PAGE_CACHE;
			}).map(function (key) {
				return caches.delete(key);
			}));
		});
		await scope.clients.claim();
	})());
});

self.addEventListener('fetch', function (event) {
	var fetchEvent = /** @type {any} */ (event);
	var request = fetchEvent.request;
	if (request.method !== 'GET') {
		return;
	}
	var url = new URL(request.url);
	if (url.origin !== self.location.origin) {
		return;
	}
	if (request.mode === 'navigate') {
		fetchEvent.respondWith(networkFirst(request, fetchEvent.preloadResponse));
		return;
	}
	if (isStaticAsset(url)) {
		fetchEvent.respondWith(staleWhileRevalidate(request));
	}
});