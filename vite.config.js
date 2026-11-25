import { defineConfig } from "vite";
import { createReadStream, existsSync, statSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import build from "./build.js";

const ROOT = dirname(fileURLToPath(import.meta.url));

function customHtmlBuilder() {
	return {
		name: "custom-html-builder",
		buildStart: build,
		async handleHotUpdate({ file, server }) {
			if (file.endsWith(".html") && !file.includes("Dist")) {
				await build();
				server.ws.send({ type: "full-reload", path: "*" });
				return [];
			}
		}
	};
}

function unityCompression(outDir) {
	const dist = resolve(ROOT, outDir);
	const variants = [
		{ accepts: "br", suffix: ".br", encoding: "br" },
		{ accepts: "gzip", suffix: ".gz", encoding: "gzip" }
	];

	const handler = (req, res, next) => {
		const pathname = new URL(req.url || "/", "http://localhost").pathname;
		if (pathname !== "/unity.html" && !/(?:^|\/)Dist\/unity\.html$/.test(pathname)) return next();

		const plain = join(dist, "unity.html");
		if (!existsSync(plain)) return next();
		const accept = String(req.headers["accept-encoding"] || "").toLowerCase();
		const chosen = variants.find(
			(variant) => accept.includes(variant.accepts) && existsSync(plain + variant.suffix)
		);
		const file = chosen ? plain + chosen.suffix : plain;

		res.statusCode = 200;
		res.setHeader("Content-Type", "text/html; charset=utf-8");
		res.setHeader("Vary", "Accept-Encoding");
		res.setHeader("Cache-Control", "no-cache");
		if (chosen) res.setHeader("Content-Encoding", chosen.encoding);
		res.setHeader("Content-Length", String(statSync(file).size));
		if (req.method === "HEAD") return res.end();

		const stream = createReadStream(file);
		stream.once("error", () => {
			if (res.headersSent) res.destroy();
			else next();
		});
		stream.pipe(res);
	};

	return {
		name: "unity-compression",
		configureServer(server) {
			server.middlewares.use(handler);
		},
		configurePreviewServer(server) {
			server.middlewares.use(handler);
		}
	};
}

export default defineConfig(({ mode }) => ({
	plugins: [customHtmlBuilder(), unityCompression("Dist")],
	server: {
		port: 3621
	},
	preview: {
		port: 3621
	},
	build: {
		outDir: "Dist",
		assetsDir: "Assets"
	},
	publicDir: "public",
	assetsInclude: "**/*.html",
	envDir: "./",
	builder: {
		buildApp: () => build({ ie8: mode === "ie8" })
	}
}));
