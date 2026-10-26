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
 *   node build.js --no-merge-props -> keep individual Object.defineProperty calls
 *   node build.js --ie8      -> also emit accessor-free *.ie8.dist.js bundles
 *   node build.js --help     -> show this message
 *
 * The dist folder defaults to the sibling "LVOS-dist" repo if it exists,
 * otherwise a local "./dist" folder.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync, cpSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import esbuild from "esbuild";
import ts from "typescript";
import { parse } from "acorn";
import { transformAccessorsForIe8, transpileForIe8 } from "./ie8-accessors.js";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SCRIPTS = join(ROOT, "Scripts");

/**
 * Static assets copied verbatim into the dist folder. Each entry's "from" is
 * resolved relative to ROOT and its "to" relative to the dist folder.
 * @type {{from: string, to?: string, exclude?: string[]}}
 */
const ASSETS = [
	{ from: "Styles" },
	{ from: "Applications", exclude: ["MPTool", "GeodeWeb"] },
	{ from: "Assets" },
	{ from: "manifest.json" },
	{ from: "manifest-mobile.json" },
	{ from: "icon-192.png" },
	{ from: "icon-512.png" }
];

/**
 * Production HTML generated into the dist folder. Keys are the output filename;
 * "scripts" is the JS bundle loaded by that page, "source" is the src HTML that
 * this page is derived from (used only for reference, not parsing).
 */
const PAGES = {
	"index.html": {
		source: "index.html",
		script: "desktop.dist.js",
		// Optional feature scripts loaded separately (deferred) instead of being
		// bundled. WebGraphics is only needed for the screenshot tool, so it stays
		// out of the main bundle and its 3D/GLSL code is never parsed on boot.
		extras: [
			"Scripts/WebGraphics/Graphics.js",
			"Scripts/WebGraphics/Graphics3D.js",
			"Scripts/WebGraphics/HTMLInCanvas.js",
			"Scripts/WebGraphics/ScreenShooter.js"
		]
	},
	"mobile.html": { source: "mobile.html", script: "mobile.dist.js" }
};

/**
 * The folder the extensions live in. Extensions are never bundled: the window
 * manager loads them by name, so an extension can be added, changed or left out
 * without rebuilding the bundle. The scripts of this folder are copied into the
 * dist folder and loaded separately (deferred) by the pages that ask for them.
 */
const EXTENSIONS_FOLDER = "Scripts/Extensions";

/**
 * Ordered source lists per bundle. Order is load-critical; do not reorder
 * without checking the dependency graph (e.g. Reflector must precede
 * DesktopManager, index.js must be last).
 */
const BUNDLES = {
	"desktop.dist.js": [
		"CustomPrototypes.js", // shared prototypes + "use strict" prologue
		"physics.js",          // Vector
		"Messenger.js",        // LVMessenger
		"Launchpad.js",
		"AppRegistry.js",      // appRegistry
		"WindowManager.js",
		"ElementPicker.js",
		"ScrollTabs/ScrollTabs.js",
		"WebComponents.js",
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
	const sibling = join(ROOT, "Dist");
	if (existsSync(sibling)) return sibling;
	return join(ROOT, "dist");
}

/**
 * The type declarations are only needed to type check the sources. A browser
 * has no use for them, so they are never copied into the dist folder.
 *
 * @param {string} src
 */
function isNotTypeDeclaration(src) {
	return !src.endsWith(".d.ts");
}
function copyAssets(dist) {
	for (const asset of ASSETS) {
		const src = join(ROOT, asset.from);
		const dest = join(dist, asset.to);
		if (!existsSync(src)) {
			console.warn("Asset not found, skipping: " + asset.from);
			continue;
		}
		cpSync(src, dest, {
			recursive: true,
			filter: (path) =>
				isNotTypeDeclaration(path) &&
				!["MPTool", "GeodeWeb"].includes(basename(path))
		});
		console.log("[copy] " + asset.from + " -> " + dest);
	}

	// Ensure WebGraphics, WebAudioVisualizer, WebAura, WebMedia, ScrollTabs, the
	// legacy polyfills and the extensions are present in dist.
	const extraDirs = [
		{ from: "Scripts/WebGraphics", to: "Scripts/WebGraphics" },
		{ from: "Scripts/WebAudioVisualizer", to: "Scripts/WebAudioVisualizer" },
		{ from: "Scripts/WebAura", to: "Scripts/WebAura" },
		{ from: "Scripts/WebMedia", to: "Scripts/WebMedia" },
		{ from: "Scripts/LegacyPolyfills.js", to: "Scripts/LegacyPolyfills.js" },
		{ from: "ScrollTabs", to: "ScrollTabs" },
		{ from: EXTENSIONS_FOLDER, to: EXTENSIONS_FOLDER }
	];
	for (const d of extraDirs) {
		const src = join(ROOT, d.from);
		const dest = join(dist, d.to);
		if (existsSync(src)) {
			cpSync(src, dest, { recursive: true, filter: isNotTypeDeclaration });
			console.log("[copy] " + d.from + " -> " + dest);
		}
	}
}

function writePage(dist, page, config) {
	const srcPath = join(ROOT, config.source);
	if (!existsSync(srcPath)) {
		console.warn(config.source + " not found; skipping " + page + ".");
		return;
	}

	// Replace every <script> tag (external or inline) with the production bundle.
	// The legacy ES5 polyfills are re-added with `nomodule`, so only browsers
	// without module support download them; modern Chrome ignores the tag entirely.
	const src = readFileSync(srcPath, "utf8");

	// Extensions are never bundled: the dist folder must not contain an
	// extension implementation baked into a bundle. The scripts the page asks
	// for are copied into the dist folder as they are and loaded separately
	// (deferred) instead, so the extension is a file that can be added, changed
	// or left out without rebuilding the bundle.
	const extensionScripts = [];
	const extensionPattern = new RegExp(
		'<script\\b[^>]*\\bsrc="([^"]*' + EXTENSIONS_FOLDER + '/[^"]*)"[^>]*>',
		"gi"
	);
	for (const match of src.matchAll(extensionPattern)) {
		extensionScripts.push(match[1].replace(/^\.\//, ""));
	}

	const extras = (config.extras || [])
		.concat(extensionScripts)
		.map((extra) => '<script src="./' + extra + '" defer></script>\n')
		.join("");
	const out = src
		.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
		.replace(
			/<\/head>/i,
			'<script nomodule src="./Scripts/LegacyPolyfills.js"></script>\n' +
			'<script src="./' + config.script + '" defer></script>\n' +
			extras + '</head>'
		);
	writeFileSync(join(dist, page), out);
	console.log("[page] " + page + " -> scripts replaced with " + config.script);
}

function writePages(dist, ie8) {
	for (const [page, config] of Object.entries(PAGES)) writePage(dist, page, config);

	if (ie8) {
		writePage(dist, "indexIE8.html", {
			source: "indexIE8.html",
			script: "desktop.ie8.dist.js",
			extras: []
		});
	}
}

function writeServiceWorker(dist, ie8) {
	// Generate a dedicated production service worker that precaches the bundles
	// and static assets. Kept intentionally simple and deterministic.
	const urls = [
		"\'./\'",
		"\'./index.html\'",
		"\'./mobile.html\'",
		"\'./manifest.json\'",
		"\'./manifest-mobile.json\'",
		"\'./icon-192.png\'",
		"\'./icon-512.png\'",
		"\'./desktop.dist.js\'",
		"\'./mobile.dist.js\'"
	];
	if (ie8) {
		urls.push("\'./indexIE8.html\'", "\'./desktop.ie8.dist.js\'");
	}
	const precacheUrls = urls.join(",\n\t");

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

/**
 * Merge adjacent `Object.defineProperty(target, key, attrs)` expression
 * statements that share the same target into a single
 * `Object.defineProperties(target, { [key]: attrs, ... })` call.
 *
 * The source files keep their individual calls (readable + TypeScript sees the
 * real property descriptors); this only rewrites the temporary bundle input.
 * Only consecutive statements and side-effect-free targets (identifiers or
 * property accesses such as `Dialog.prototype`) are merged, so evaluation order
 * relative to surrounding code is unchanged. Duplicate keys stop a run so the
 * last-write-wins semantics of separate calls are preserved.
 *
 * @param {string} source
 * @param {string} fileName
 * @returns {{ code: string, calls: number, groups: number }}
 */
function mergeDefineProperties(source, fileName) {
	const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
	/** @type {{ start: number, end: number, text: string }[]} */
	const edits = [];
	let calls = 0;

	/** @param {ts.Node} node */
	const isSimpleTarget = (node) => ts.isIdentifier(node) || ts.isPropertyAccessExpression(node);

	/**
	 * Property keys can be written bare (`isOpen:`) or quoted (`"is-open":`) when
	 * they are literals; only dynamic keys need the computed `[...]` form.
	 * `__proto__` stays computed because a plain `__proto__:` key would change the
	 * object's prototype instead of creating a property.
	 *
	 * @param {ts.Expression} key
	 */
	const formatKey = (key) => {
		if (ts.isStringLiteral(key) && key.text !== "__proto__") {
			return ts.isIdentifierText(key.text, ts.ScriptTarget.Latest) ? key.text : key.getText(file);
		}
		if (ts.isNumericLiteral(key)) return key.getText(file);
		return "[" + key.getText(file) + "]";
	};

	/**
	 * @param {ts.Statement} statement
	 * @returns {{ target: string, key: string, label: string, attributes: string } | null}
	 */
	const asDefineCall = (statement) => {
		if (!ts.isExpressionStatement(statement)) return null;
		const call = statement.expression;
		if (!ts.isCallExpression(call) || call.arguments.length !== 3) return null;
		const callee = call.expression;
		if (!ts.isPropertyAccessExpression(callee)) return null;
		if (!ts.isIdentifier(callee.expression) || callee.expression.text !== "Object") return null;
		if (callee.name.text !== "defineProperty") return null;
		const [target, key, attributes] = call.arguments;
		if (!isSimpleTarget(target) || ts.isSpreadElement(key) || ts.isSpreadElement(attributes)) return null;
		return {
			target: target.getText(file),
			key: key.getText(file),
			label: formatKey(key),
			attributes: attributes.getText(file)
		};
	};

	/**
	 * @param {ts.NodeArray<ts.Statement>} statements
	 */
	const processStatements = (statements) => {
		for (let i = 0; i < statements.length; i++) {
			const first = asDefineCall(statements[i]);
			if (!first) continue;

			const keys = new Set([first.key]);
			const group = [first];
			let j = i + 1;
			for (; j < statements.length; j++) {
				const next = asDefineCall(statements[j]);
				if (!next || next.target !== first.target || keys.has(next.key)) break;
				keys.add(next.key);
				group.push(next);
			}

			if (group.length > 1) {
				const start = statements[i].getStart(file);
				const lineStart = source.lastIndexOf("\n", start - 1) + 1;
				const indent = source.slice(lineStart, start).match(/^[ \t]*/)[0];
				let text = "Object.defineProperties(" + first.target + ", {\n";
				for (const item of group) {
					text += indent + "\t" + item.label + ": " + item.attributes + ",\n";
				}
				text += indent + "});";
				edits.push({ start, end: statements[j - 1].getEnd(), text });
				calls += group.length;
			}
			i = j - 1;
		}
	};

	/** @param {ts.Node} node */
	const walk = (node) => {
		if (ts.isSourceFile(node) || ts.isBlock(node) || ts.isModuleBlock(node) ||
			ts.isCaseClause(node) || ts.isDefaultClause(node)) {
			processStatements(node.statements);
		}
		ts.forEachChild(node, walk);
	};
	walk(file);

	edits.sort((a, b) => b.start - a.start);
	let code = source;
	for (const edit of edits) {
		code = code.slice(0, edit.start) + edit.text + code.slice(edit.end);
	}
	return { code, calls, groups: edits.length };
}

function readGroup(files, mergeProps, ie8) {
	// IE8 has no custom elements or ES2015 built-ins, so the custom-element
	// definitions (and their HTMLSpanElement/HTMLTimeElement base classes) are
	// left out of the legacy bundle.
	const ie8Skip = new Set(["WebComponents.js"]);
	const parts = [];
	let calls = 0;
	let groups = 0;
	for (const file of files) {
		if (ie8 && ie8Skip.has(file)) continue;

		// Bundle entries are relative to Scripts/ by default, but may also point at a
		// repo-root file (e.g. "ScrollTabs/ScrollTabs.js").
		const underScripts = join(SCRIPTS, file);
		const full = existsSync(underScripts) ? underScripts : join(ROOT, file);
		if (!existsSync(full)) {
			console.error("Missing source file: " + file);
			process.exitCode = 1;
			continue;
		}
		let src = readFileSync(full, "utf8");
		if (mergeProps) {
			const merged = mergeDefineProperties(src, file);
			src = merged.code;
			calls += merged.calls;
			groups += merged.groups;
		}
		parts.push("// ===== " + file + " =====\n" + src);
	}
	let code = parts.join("\n\n");
	let accessors = 0;
	if (ie8) {
		const transformed = transformAccessorsForIe8(code, "bundle.js");
		code = transpileForIe8(transformed.code, "bundle.js");
		accessors = transformed.accessors;
	}
	return { code, calls, groups, accessors };
}

function assertEs3(code, outfile) {
	try {
		parse(code, { ecmaVersion: 3, sourceType: "script" });
	} catch (error) {
		throw new Error("IE8 bundle " + outfile + " is not valid ES3: " + error.message);
	}
}


/**
 * ES3 reserved words that IE8 rejects when used as identifier property names
 * (e.g. `x.catch(...)`, `x.delete`, `x.class = 1`). Esbuild's `es5` target
 * does not quote them, so we do a targeted regex pass after minification.
 */
const ES3_RESERVED_PROPS = [
	"abstract", "boolean", "byte", "char", "class", "const", "debugger",
	"double", "enum", "export", "extends", "final", "float", "goto",
	"implements", "import", "int", "interface", "long", "native", "package",
	"private", "protected", "public", "short", "static", "super",
	"synchronized", "throws", "transient", "volatile",
	// ES1 keywords also forbidden as property names in IE8:
	"catch", "delete", "finally", "in", "instanceof", "new",
	"return", "switch", "throw", "try", "typeof", "void", "with"
];

/**
 * Rewrite `expr.keyword` property accesses to bracket notation so IE8 does
 * not choke on reserved words in property position.
 *
 * @param {string} code
 * @returns {string}
 */
function quoteReservedProperties(code) {
	const pattern = new RegExp(
		"\\.(" + ES3_RESERVED_PROPS.join("|") + ")(?=[^A-Za-z0-9_$]|$)",
		"g"
	);
	return code.replace(pattern, function(_, kw) { return "[\"" + kw + "\"]"; });
}

/**
 * Apply patches required specifically for IE8:
 * 1. Disable theme setting/loading so <body> class mutations and theme lookups don't crash
 * 2. Disable console interception on load
 */
function applyIe8SpecificPatches(code) {
	// Disable theme application functions in IE8 (return early)
	code = code.replace(/function setThemeOption\([^)]*\)\s*\{/, "$&return;");
	code = code.replace(/function loadThemeSetting\([^)]*\)\s*\{/, "$&return;");

	// Disable bindConsole
	code = code.replace(/var bindConsole\s*=\s*true;/, "var bindConsole = false;");
	// Disable interceptor.bindage()
	code = code.replace(/interceptor\.bindage\(\);?/, "/* interceptor.bindage(); */");

	return code;
}
async function build() {
	const noMinify = process.argv.includes("--no-minify");
	const mergeProps = !process.argv.includes("--no-merge-props");
	const ie8 = process.argv.includes("--ie8");
	const dist = resolveDist();
	console.log("Dist folder: " + dist);

	if (!existsSync(dist)) mkdirSync(dist, { recursive: true });

	for (const [outfile, files] of Object.entries(BUNDLES)) {
		const group = readGroup(files, mergeProps, false);
		const result = await esbuild.transform(group.code, {
			minify: !noMinify,
			target: "esnext",
			legalComments: "none"
		});

		const outPath = join(dist, outfile);
		writeFileSync(outPath, result.code);
		const bytes = Buffer.byteLength(result.code);
		const merged = mergeProps && group.groups
			? " [" + group.calls + " defineProperty -> " + group.groups + " defineProperties]"
			: "";
		console.log(
			(noMinify ? "[dev ] " : "[dist] ") +
			outfile.padEnd(20) +
			" -> " +
			(bytes / 1024).toFixed(1) + " KB (" + files.length + " files)" +
			merged
		);

		if (!ie8) continue;

		const ie8Group = readGroup(files, mergeProps, true);
		const ie8Result = await esbuild.transform(ie8Group.code, {
			minify: !noMinify,
			target: "es5",
			legalComments: "none"
		});
		const ie8Outfile = outfile.replace(/\.dist\.js$/, ".ie8.dist.js");
		const ie8Code = applyIe8SpecificPatches(quoteReservedProperties(ie8Result.code));
		assertEs3(ie8Code, ie8Outfile);
		writeFileSync(join(dist, ie8Outfile), ie8Code);
		console.log(
			"[ie8 ] " +
			ie8Outfile.padEnd(20) +
			" -> " +
			(Buffer.byteLength(ie8Code) / 1024).toFixed(1) + " KB (" +
			ie8Group.accessors + " accessor names)"
		);
	}

	copyAssets(dist);
	writePages(dist, ie8);
	writeServiceWorker(dist, ie8);

	console.log("\nDone.");
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
	console.log("VulpOS build script.\n\nOptions:\n  --no-minify       emit readable (unminified) bundles\n  --no-merge-props  keep individual Object.defineProperty calls\n  --ie8             also emit accessor-free *.ie8.dist.js bundles\n  --help            show this help");
} else {
	build().catch(function (err) {
		console.error(err);
		process.exit(1);
	});
}
