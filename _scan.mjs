import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
const ROOT = process.cwd();
function walk(d, out = []) {
	for (const e of readdirSync(d, { withFileTypes: true })) {
		if (e.name === ".git" || e.name === "node_modules" || e.name === "Dist") continue;
		const p = join(d, e.name);
		if (e.isDirectory()) walk(p, out);
		else if (/\.(js|html)$/.test(e.name)) out.push(p);
	}
	return out;
}
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'])\/\/.*/g, "$1");
const files = walk(ROOT);
const contents = files.map((f) => strip(readFileSync(f, "utf8")));
const all = contents.join("\n");
for (const [i, src] of contents.entries()) {
	const names = new Set();
	for (const m of src.matchAll(/^[ \t]*(?:var|const|let|function)\s+([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
	const rows = [];
	for (const n of names) {
		const re = new RegExp("\\b" + n.replace(/\$/g, "\\$") + "\\b", "g");
		if ((all.match(re) || []).length <= 1) rows.push(n);
	}
	if (rows.length) console.log(files[i].replace(ROOT + "/", "") + ": " + rows.join(", "));
}
