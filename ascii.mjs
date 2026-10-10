import { chromium } from 'playwright';
import fs from 'node:fs';

const dir = 'C:/Users/Lasse/Documents/Projects/LVOS/.reproframes/screencast-meta.json';
const frames = JSON.parse(fs.readFileSync(dir, 'utf8'));

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');

const rendered = await page.evaluate(async (frames) => {
	const out = [];
	for (const f of frames) {
		const img = new Image();
		await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = 'data:image/jpeg;base64,' + f.data; });
		const cw = 48, ch = 26;
		const c = document.getElementById('c');
		c.width = img.width; c.height = img.height;
		const ctx = c.getContext('2d');
		ctx.clearRect(0, 0, c.width, c.height);
		ctx.drawImage(img, 0, 0);
		const d = ctx.getImageData(0, 0, img.width, img.height).data;
		const chars = ' .:-=+*#%@';
		let rows = [];
		for (let y = 0; y < ch; y++) {
			let line = '';
			for (let x = 0; x < cw; x++) {
				let r = 0, g = 0, b = 0, n = 0;
				const x0 = Math.floor(x * img.width / cw), x1 = Math.max(x0 + 1, Math.floor((x + 1) * img.width / cw));
				const y0 = Math.floor(y * img.height / ch), y1 = Math.max(y0 + 1, Math.floor((y + 1) * img.height / ch));
				for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
					const i = (yy * img.width + xx) * 4;
					if ((d[i] + d[i + 1] + d[i + 2]) === 0 && d[i + 3] === 0) continue;
					r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
				}
				if (!n) { line += ' '; continue; }
				const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / n;
				const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
				line += sat > 0.35 ? 'O' : chars[Math.min(9, Math.floor(lum / 256 * 10))];
			}
			rows.push(line);
		}
		out.push({ frames: rows });
	}
	return out;
}, frames);

const t = frames[0].meta && frames[0].meta.timestamp;
const W = 12;
for (let i = 0; i < rendered.length; i += 12) {
	const ts = (frames[i].meta.timestamp - t) * 1000;
	console.log('frame', i, Math.round(ts) + 'ms'.padStart(5));
	console.log(rendered[i].frames.join('\n'));
	console.log();
}

await browser.close();