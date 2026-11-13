import { defineConfig } from "vite";
import build from "./build.js";

export default defineConfig({
	server: {
		port: 3621
	},
	esbuild: {

	},
	build: {
		outDir: "Dist",
		assetsDir: "Assets"
	},
	publicDir: "Dist",
	assetsInclude: "*.html",
	envDir: "Dist",
	html: {

	},
	dev: {

	},
	environments: {
		"dev": {
			
		}
	}
	builder: {
		buildApp: () => {
			// builder.
			build();
		}
	}
});