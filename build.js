#!/usr/bin/env node

/**
 * LVOS build script.
 *
 * Produces minified single-file bundles for the modern pages (desktop + mobile)
 * by concatenating the ordered source files and running esbuild's minifier over
 * the result. The source files are globals-based (no ES modules) and have
 * strict load-order constraints, so we concatenate them in the exact source
 * order rather than letting esbuild bundle/resolve modules.
 *
 * Usage:
 *   node build.js            -> write minified bundles into the dist folder
 *   node build.js --no-minify-> write unminified (readable) bundles
 *   node build.js --help     -> show this message
 *
 * The dist folder defaults to the sibling "LVOS-dist" repo if it exists,
 * otherwise a local "./dist" folder.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync, cpSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import esbuild from "esbuild";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SCRIPTS = join(ROOT, "Scripts");

/**
 * Static assets copied verbatim into the dist folder. Each entry's "from" is
 * resolved relative to ROOT and its "to" relative to the dist folder.
 */
const ASSETS = [
	{ from: "Styles", to: "Styles" },
	{ from: "manifest.json", to: "manifest.json" },
	{ from: "manifest-mobile.json", to: "manifest-mobile.json" },
	{ from: "icon-192.png", to: "icon-192.png" },
	{ from: "icon-512.png", to: "icon-512.png" }
];

/**
 * Production HTML generated into the dist folder. Keys are the output filename;
 * "scripts" is the JS bundle loaded by that page, "source" is the src HTML that
 * this page is derived from (used only for reference, not parsing).
 */
const PAGES = {
	"index.html": { source: "index.html", script: "desktop.dist.js" },
	"mobile.html": { source: "mobile.html", script: "mobile.dist.js" }
};

/**
 * Ordered source lists per bundle. Order is load-critical; do not reorder
 * without checking the dependency graph (e.g. Reflector must precede
 * DesktopManager, index.js must be last).
 */
const BUNDLES = {
	"desktop.dist.js": [
		"CustomPrototypes.js", // polyfills first
		"physics.js",          // Vector
		"youtube.js",          // YouTubeParser
		"Messenger.js",        // LVMessenger
		"Launchpad.js",
		"AppRegistry.js",      // appRegistry
		"WindowManager.js",
		"Reflector.js",        // MUST precede DesktopManager (new Reflector at load)
		"DesktopManager.js",
		"Settings.js",
		"ProvisionedApps.js",
		"Console.js",
		"FileSystem.js",
		"NewtonVirus.js",
		"index.js"             // boot, last
	],
	"mobile.dist.js": [
		"CustomPrototypes.js",
		"Launchpad.js",
		"AppRegistry.js",
		"Messenger.js",
		"Settings.js",
		"ProvisionedApps.js",
		"FileSystem.js",
		"Mobile.js",
		"index.js"             // boot, last
	]
};

function resolveDist() {
	// Prefer the sibling LVOS-dist repo if it exists.
	const sibling = join(ROOT, "LVOS-dist");
	if (existsSync(sibling)) return sibling;
	return join(ROOT, "dist");
}

function copyAssets(dist) {
	for (const asset of ASSETS) {
		const src = join(ROOT, asset.from);
		const dest = join(dist, asset.to);
		if (!existsSync(src)) {
			console.warn("Asset not found, skipping: " + asset.from);
			continue;
		}
		cpSync(src, dest, { recursive: true });
		console.log("[copy] " + asset.from + " -> " + dest);
	}
}

function writePages(dist) {
	for (const [page, config] of Object.entries(PAGES)) {
		const srcPath = join(ROOT, config.source);
		if (!existsSync(srcPath)) {
			console.warn(config.source + " not found; skipping " + page + ".");
			continue;
		}

		// Replace every <script> tag (external or inline) with a single fixed
		// deferred bundle tag pointing at the production bundle.
		const src = readFileSync(srcPath, "utf8");
		const out = src
			.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
			.replace(
				/<\/head>/i,
				'<script src="./' + config.script + '" defer></script>\n</head>'
			);
		writeFileSync(join(dist, page), out);
		console.log("[page] " + page + " -> scripts replaced with " + config.script);
	}
}

function writeServiceWorker(dist) {
	// Generate a dedicated production service worker that precaches the bundles
	// and static assets. Kept intentionally simple and deterministic.
	const precacheUrls = [
		"\'./\'",
		"\'./index.html\'",
		"\'./mobile.html\'",
		"\'./manifest.json\'",
		"\'./manifest-mobile.json\'",
		"\'./icon-192.png\'",
		"\'./icon-512.png\'",
		"\'./desktop.dist.js\'",
		"\'./mobile.dist.js\'"
	].join(",\n\t");

	const sw = `const CACHE_VERSION = 'lvos-v2';
const STATIC_CACHE = 'lvos-static-' + CACHE_VERSION;
const PAGE_CACHE = 'lvos-pages-' + CACHE_VERSION;

const precacheUrls = [
\t${precacheUrls}
];

function isStaticAsset(url) {
	return url.pathname.includes('/Styles/') ||
		url.pathname.includes('/Applications/') ||
		url.pathname.includes('/Assets/') ||
		/\.(css|js|mjs|json|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|mp3|ogg|wav|mp4|webm)(\\?.*)?$/i.test(url.pathname);
}

self.addEventListener('install', function (event) {
	event.waitUntil(caches.open(STATIC_CACHE).then(function (cache) {
		return Promise.allSettled(precacheUrls.map(function (url) {
			return cache.add(url);
		}));
	}));
	self.skipWaiting();
});

self.addEventListener('activate', function (event) {
	event.waitUntil(caches.keys().then(function (keys) {
		return Promise.all(keys.filter(function (key) {
			return key !== STATIC_CACHE && key !== PAGE_CACHE;
		}).map(function (key) {
			return caches.delete(key);
		}));
	}));
	self.clients.claim();
});

self.addEventListener('fetch', function (event) {
	var request = event.request;
	if (request.method !== 'GET') return;
	var url = new URL(request.url);
	if (url.origin !== self.location.origin) return;
	if (request.mode === 'navigate') {
		event.respondWith(fetch(request).catch(function () {
			return caches.match(request).then(function (cached) {
				return cached || caches.match('./index.html');
			});
		}));
		return;
	}
	if (isStaticAsset(url)) {
		event.respondWith(fetch(request)
			.then(function (response) {
				var clone = response.clone();
				caches.open(STATIC_CACHE).then(function (cache) { cache.put(request, clone); });
				return response;
			})
			.catch(function () {
				return caches.match(request);
			}));
	}
});
`;
	writeFileSync(join(dist, "sw.js"), sw);
	console.log("[copy] sw.js -> dist (generated for bundles)");
}

function readGroup(files) {
	const parts = [];
	for (const file of files) {
		const full = join(SCRIPTS, file);
		if (!existsSync(full)) {
			console.error("Missing source file: " + file);
			process.exitCode = 1;
			continue;
		}
		const src = readFileSync(full, "utf8");
		parts.push("// ===== " + file + " =====\n" + src);
	}
	return parts.join("\n\n");
}

async function build() {
	const noMinify = process.argv.includes("--no-minify");
	const dist = resolveDist();
	console.log("Dist folder: " + dist);

	if (!existsSync(dist)) mkdirSync(dist, { recursive: true });

	for (const [outfile, files] of Object.entries(BUNDLES)) {
		const input = readGroup(files);
		const result = await esbuild.transform(input, {
			minify: !noMinify,
			target: "esnext",
			legalComments: "none"
		});

		const outPath = join(dist, outfile);
		writeFileSync(outPath, result.code);
		const bytes = Buffer.byteLength(result.code);
		console.log(
			(noMinify ? "[dev ] " : "[dist] ") +
			outfile.padEnd(20) +
			" -> " +
			(bytes / 1024).toFixed(1) + " KB (" + files.length + " files)"
		);
	}

	copyAssets(dist);
	writePages(dist);
	writeServiceWorker(dist);

	console.log("\nDone.");
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
	console.log("LVOS build script.\n\nOptions:\n  --no-minify   emit readable (unminified) bundles\n  --help        show this help");
} else {
	build().catch(function (err) {
		console.error(err);
		process.exit(1);
	});
}
