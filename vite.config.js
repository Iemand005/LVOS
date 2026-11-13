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
	builder: {
		buildApp: () => {
			// builder.
			build();
		} 
	}
});