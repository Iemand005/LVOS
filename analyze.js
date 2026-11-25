#!/usr/bin/env node

/**
 * Profiles the size of the unity page.
 *
 * For files that are concatenated into desktop.dist.js (and for the inline
 * stylesheets) the number reported is the marginal saving: minify the whole
 * bundle, then minify it again with that file removed and take the difference.
 * For scripts that are inlined separately (WebGraphics, extensions, legacy
 * polyfills) the full minified size is reported. Top-level declarations in the
 * bundle are measured the same marginal way, so the hungriest classes and
 * functions can be spotted directly.
 *
 * Usage:
 *   npm run analyze                         -> text report
 *   node analyze.js --top=100               -> more symbols
 *   npm run analyze:json                    -> machine-readable report
 *   node analyze.js --top=0                 -> every symbol
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { gzipSync, brotliCompressSync, constants as zlibConstants } from "zlib";
import esbuild from "esbuild";
import ts from "typescript";
import {
	BUNDLES,
	PAGES,
	ROOT,
	UNITY_NOMODULE_SCRIPTS,
	getExtensionScripts,
	getStylesheets,
	minifyHtml,
	readGroup,
	resolveDist
} from "./build.js";

const PAGE = PAGES["index.html"];
const topArg = process.argv.find((arg) => arg.startsWith("--top="));
const TOP = topArg ? Math.max(0, Number(topArg.slice("--top=".length)) || 0) : 40;
const asJson = process.argv.includes("--json");

/** @param {string} code */
function gzipBytes(code) {
	return gzipSync(Buffer.from(code)).length;
}

/** @param {string} code */
async function minifyJs(code) {
	const result = await esbuild.transform(code, {
		minify: true,
		target: "esnext",
		legalComments: "none"
	});
	return result.code;
}

/** @param {string} code */
async function minifyCss(code) {
	const result = await esbuild.transform(code, {
		loader: "css",
		minify: true,
		legalComments: "none"
	});
	return result.code;
}

/** @param {string} path */
function readSource(path) {
	const full = join(ROOT, path);
	return existsSync(full) ? readFileSync(full, "utf8") : null;
}

const src = readSource(PAGE.source);
if (src === null) throw new Error("Missing page source: " + PAGE.source);

const bundleFiles = BUNDLES[PAGE.script];
const bundleSource = readGroup(bundleFiles, true, false).code;
const bundleMin = await minifyJs(bundleSource);
const bundleGzip = gzipBytes(bundleMin);

/**
 * @param {string} name
 * @param {string} kind
 * @param {number} bytes
 * @param {number} gzip
 */
const row = (name, kind, bytes, gzip) => ({ name, kind, bytes, gzip });
const byBytes = (a, b) => b.bytes - a.bytes;

const bundleFileRows = [];
for (const file of bundleFiles) {
	const without = await minifyJs(readGroup(bundleFiles.filter((other) => other !== file), true, false).code);
	bundleFileRows.push(row(file, "bundle source", bundleMin.length - without.length, bundleGzip - gzipBytes(without)));
}
bundleFileRows.sort(byBytes);

const sourceFile = ts.createSourceFile("bundle.js", bundleSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const markers = [];
for (const match of bundleSource.matchAll(/^\/\/ ===== (.+) =====$/gm)) {
	markers.push({ at: match.index, name: match[1] });
}
/** @param {number} pos */
const ownerOf = (pos) => {
	let owner = "?";
	for (const marker of markers) {
		if (marker.at > pos) break;
		owner = marker.name;
	}
	return owner;
};

/**
 * @param {ts.Statement} statement
 */
function describe(statement) {
	if (ts.isClassDeclaration(statement) || ts.isFunctionDeclaration(statement)) {
		return {
			kind: ts.isClassDeclaration(statement) ? "class" : "function",
			name: statement.name?.text || "<anonymous>"
		};
	}
	if (ts.isVariableStatement(statement)) {
		const names = statement.declarationList.declarations
			.map((declaration) => declaration.name.getText(sourceFile))
			.join(", ");
		return { kind: "var", name: names.length > 70 ? names.slice(0, 67) + "..." : names };
	}
	const text = statement.getText(sourceFile).replace(/\s+/g, " ").trim();
	return { kind: "statement", name: text.length > 70 ? text.slice(0, 67) + "..." : text };
}

const symbolRows = [];
for (const statement of sourceFile.statements) {
	if (ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression)) continue;
	const start = statement.getStart(sourceFile);
	const without = await minifyJs(bundleSource.slice(0, start) + bundleSource.slice(statement.getEnd()));
	const info = describe(statement);
	symbolRows.push(
		row(info.name + "  (" + ownerOf(start) + ")", info.kind, bundleMin.length - without.length, bundleGzip - gzipBytes(without))
	);
}
symbolRows.sort(byBytes);

const extras = PAGE.extras.concat(getExtensionScripts(src), UNITY_NOMODULE_SCRIPTS);
const extraRows = [];
for (const path of extras) {
	const code = readSource(path);
	if (code === null) continue;
	const min = await minifyJs(code);
	const kind = path.includes("/Extensions/") ? "extension"
		: UNITY_NOMODULE_SCRIPTS.includes(path) ? "legacy"
			: "extra";
	extraRows.push(row(path, kind, min.length, gzipBytes(min)));
}
extraRows.sort(byBytes);

const stylesheets = getStylesheets(src)
	.map((name) => ({ name, code: readSource(name) }))
	.filter((sheet) => sheet.code !== null);
const cssMin = await minifyCss(stylesheets.map((sheet) => sheet.code).join("\n"));
const cssGzip = gzipBytes(cssMin);
const cssRows = [];
for (const sheet of stylesheets) {
	const without = await minifyCss(stylesheets.filter((other) => other !== sheet).map((other) => other.code).join("\n"));
	cssRows.push(row(sheet.name, "stylesheet", cssMin.length - without.length, cssGzip - gzipBytes(without)));
}
cssRows.sort(byBytes);

const shell = minifyHtml(src
	.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
	.replace(/<link\b[^>]*>/gi, (tag) => (/rel\s*=\s*["']stylesheet["']/i.test(tag) ? "" : tag)));
const dist = resolveDist();
const unityPath = join(dist, "unity.html");
const unityBuffer = existsSync(unityPath) ? readFileSync(unityPath) : null;
const actualBytes = unityBuffer === null ? null : unityBuffer.length;
const packedPath = join(dist, "unity.packed.html");
const packedBytes = existsSync(packedPath) ? readFileSync(packedPath).length : null;
const totalBytes = shell.length + cssMin.length + bundleMin.length + extraRows.reduce((sum, item) => sum + item.bytes, 0);

const report = {
	unityHtmlBytes: actualBytes,
	unityGzipBytes: unityBuffer === null ? null : gzipSync(unityBuffer, { level: 9 }).length,
	unityBrotliBytes: unityBuffer === null ? null : brotliCompressSync(unityBuffer, {
		params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 }
	}).length,
	unityPackedBytes: packedBytes,
	estimatedBytes: totalBytes,
	shellBytes: shell.length,
	bundleBytes: bundleMin.length,
	stylesheetsBytes: cssMin.length,
	bundleFiles: bundleFileRows,
	symbols: symbolRows,
	extras: extraRows,
	stylesheets: cssRows
};

if (asJson) {
	console.log(JSON.stringify(report, null, 2));
} else {
	const kb = (bytes) => (bytes / 1024).toFixed(1).padStart(7) + " KB";
	const table = (title, rows) => {
		console.log("\n" + title);
		console.log("  " + "name".padEnd(60) + "kind".padEnd(14) + "bytes".padStart(11) + "gzip".padStart(11));
		for (const item of rows) {
			console.log("  " + item.name.slice(0, 59).padEnd(60) + item.kind.padEnd(14) + kb(item.bytes) + kb(Math.max(0, item.gzip)));
		}
	};

	console.log("Unity page size profile");
	console.log("  actual unity.html:     " + (actualBytes === null ? "not built" : kb(actualBytes)));
	console.log("  unity.html.gz:         " + (report.unityGzipBytes === null ? "not built" : kb(report.unityGzipBytes)));
	console.log("  unity.html.br:         " + (report.unityBrotliBytes === null ? "not built" : kb(report.unityBrotliBytes)));
	console.log("  unity.packed.html:     " + (packedBytes === null ? "not built" : kb(packedBytes)));
	console.log("  estimated total:       " + kb(totalBytes));
	console.log("  HTML shell:        " + kb(shell.length));
	console.log("  JS bundle:         " + kb(bundleMin.length));
	console.log("  inline CSS:        " + kb(cssMin.length));
	console.log("  inline extras:     " + kb(extraRows.reduce((sum, item) => sum + item.bytes, 0)));
	console.log("\nByte counts for bundle sources and stylesheets are savings if that file is removed.");
	console.log("Top-level symbol counts are savings if that declaration is removed from the bundle.");
	table("Bundle source files", bundleFileRows);
	table("Top-level symbols (largest " + (TOP || "all") + ")", symbolRows.slice(0, TOP || undefined));
	table("Separately inlined scripts", extraRows);
	table("Stylesheets", cssRows);
}
