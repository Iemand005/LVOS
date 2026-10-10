import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const dir = 'C:/Users/Lasse/Documents/Projects/LVOS/.reproframes';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort();

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');

const result = await page.evaluate(async (files) => {
	const out = [];
	let prev = null;
	for (const f of files) {
		const img = new Image();
		await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/png;base64,' + f.data; });
		const c = document.getElementById('c');
		c.width = img.width; c.height = img.height;
		const ctx = c.getContext('2d');
		ctx.clearRect(0, 0, c.width, c.height);
		ctx.drawImage(img, 0, 0);
		const d = ctx.getImageData(0, 0, c.width, c.height).data;
		const n = d.length / 4;
		let diff = 0, big = 0;
		if (prev) for (let i = 0; i < d.length; i += 4) {
			const dd = Math.abs(d[i] - prev[i]) + Math.abs(d[i + 1] - prev[i + 1]) + Math.abs(d[i + 2] - prev[i + 2]);
			diff += dd; if (dd > 90) big++;
		}
		const px = (x, y) => { const i = (y * img.width + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
		out.push({
			name: f.name,
			diff: prev ? diff / n : 0,
			bigPct: prev ? 100 * big / n : 0,
			center: px(img.width >> 1, img.height >> 1),
			tl: px(5, 5), tr: px(img.width - 6, 5),
			bl: px(5, img.height - 6), br: px(img.width - 6, img.height - 6),
		});
		prev = d;
	}
	return out;
}, files.map(f => ({ name: f, data: fs.readFileSync(path.join(dir, f)).toString('base64') })));

for (const c of result) {
	console.log(c.name, 'diff=' + c.diff.toFixed(1), 'big%=' + c.bigPct.toFixed(1),
		'ctr=' + c.center.join(','), 'TL=' + c.tl.join(','), 'TR=' + c.tr.join(','), 'BL=' + c.bl.join(','), 'BR=' + c.br.join(','));
}

await browser.close();
