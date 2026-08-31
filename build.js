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

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import esbuild from "esbuild";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SCRIPTS = join(ROOT, "Scripts");

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
