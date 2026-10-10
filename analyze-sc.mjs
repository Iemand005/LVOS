import { chromium } from 'playwright';
import fs from 'node:fs';

const path = 'C:/Users/Lasse/Documents/Projects/LVOS/.reproframes/screencast-meta.json';
const frames = JSON.parse(fs.readFileSync(path, 'utf8'));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');

const metrics = await page.evaluate(async (frames) => {
	const out = [];
	for (const f of frames) {
		const img = new Image();
		await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/jpeg;base64,' + f.data; });
		const c = document.getElementById('c');
		c.width = img.width; c.height = img.height;
		const ctx = c.getContext('2d');
		ctx.clearRect(0, 0, c.width, c.height);
		ctx.drawImage(img, 0, 0);
		const d = ctx.getImageData(0, 0, c.width, c.height).data;
		const w = img.width, h = img.height;
		const rows = (y0, y1) => {
			let whitep = 0, sum = 0, n = 0;
			for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) {
				const i = (y * w + x) * 4;
				const r = d[i], g = d[i + 1], b = d[i + 2];
				const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
				sum += lum; n++;
				if (r > 235 && g > 235 && b > 235) whitep++;
			}
			return { mean: sum / n, whitePct: 100 * whitep / n };
		};
		const t = f.meta && f.meta.timestamp ? f.meta.timestamp : 0;
		out.push({
			ts: Math.round(t * 1000),
			top: rows(0, 60),
			mid: rows(h * 0.4 | 0, h * 0.45 | 0),
		});
	}
	return out;
}, frames);

for (const m of metrics) {
	console.log(m.ts + 'ms', 'topMean=' + m.top.mean.toFixed(0), 'topWhite%=' + m.top.whitePct.toFixed(1),
		'midMean=' + m.mid.mean.toFixed(0), 'midWhite%=' + m.mid.whitePct.toFixed(1));
}
await browser.close();