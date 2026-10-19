import { readFileSync } from "fs";
const file = process.argv[2];
const minRun = Number(process.argv[3] || 4);
const lines = readFileSync(file, "utf8").split(/\r?\n/).map((l) => l.trim());
const key = (i, n) => lines.slice(i, i + n).join("\n");
const seen = new Map();
for (let n = minRun; n <= 8; n++) {
	for (let i = 0; i + n <= lines.length; i++) {
		const k = key(i, n);
		if (!k.trim()) continue;
		if (!seen.has(k)) seen.set(k, []);
		seen.get(k).push(i + 1);
	}
}
const rows = [];
for (const [k, v] of seen) {
	if (v.length < 2) continue;
	rows.push({ count: v.length, at: v.slice(0, 6), lines: k.split("\n").length, text: k });
}
rows.sort((a, b) => b.lines * b.count - a.lines * a.count);
for (const r of rows.slice(0, 25)) {
	console.log("x" + r.count + " (" + r.lines + " lines) @" + r.at.join(","));
	console.log("    " + r.text.replace(/\n/g, " | ").slice(0, 160));
}
