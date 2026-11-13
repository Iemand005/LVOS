	import { defineConfig } from "vite";
	import build from "./build.js";

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

export default defineConfig({
	plugins: [customHtmlBuilder()],
	server: {
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
		buildApp: build
	}
});