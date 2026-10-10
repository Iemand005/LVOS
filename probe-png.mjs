import { chromium } from 'playwright';
import fs from 'node:fs';

const dir = 'C:/Users/Lasse/Documents/Projects/LVOS/.reproframes/png';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort();

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage();
await page.setContent('<canvas id="c"></canvas>');

const out = await page.evaluate(async (files) => {
	const res = {};
	for (const f of files) {
		const img = new Image();
		await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = 'data:image/png;base64,' + f.data; });
		const c = document.getElementById('c');
		c.width = img.width; c.height = img.height;
		const ctx = c.getContext('2d');
		ctx.clearRect(0, 0, c.width, c.height);
		ctx.drawImage(img, 0, 0);
		const d = ctx.getImageData(0, 0, img.width, img.height).data;
		const px = (x, y) => { const i = (y * img.width + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
		const col = [];
		for (let y = 0; y < img.height; y += 25) col.push(y + ':' + px(500, y).join(','));
		const rows = [5, 25, 45, 100, 330, 660].map(y => y + ':' + px(5, y).join(','));
		res[f.name] = { size: [img.width, img.height], centerCol: col, leftCol: rows, tl: px(5, 5), tm: px(500, 5), tr: px(995, 5), bl: px(5, 695), bm: px(500, 695) };
	}
	return res;
}, files.map(f => ({ name: f, data: fs.readFileSync(dir + '/' + f).toString('base64') })));

for (const [name, r] of Object.entries(out)) {
	console.log('\n### ' + name, r.size.join('x'));
	console.log('corners TL', r.tl, 'TM', r.tm, 'TR', r.tr, 'BL', r.bl, 'BM', r.bm);
	console.log('left x=5 :', r.leftCol.join('  '));
	console.log('center x=500 down:', r.centerCol.join('  '));
}

await browser.close();