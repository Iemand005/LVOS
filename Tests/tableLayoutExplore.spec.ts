import { test } from '@playwright/test';

test.use({ headless: true, channel: 'chrome' });

test('explore table cell / iframe height variants', async ({ page }) => {
	await page.goto('about:blank');
	const out = await page.evaluate(() => {
		const variants: Record<string, string> = {
			current: `
				table{width:100%;height:100%;table-layout:fixed;border-collapse:collapse}
				td.header{height:1px}
				td.article{height:auto;padding:0}
				iframe{width:100%;height:100%;display:block;border:0}`,
			absolute: `
				table{width:100%;height:100%;table-layout:fixed;border-collapse:collapse}
				td.header{height:1px}
				td.article{height:auto;padding:0;position:relative}
				iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:0}`,
			cell100: `
				table{width:100%;height:100%;table-layout:fixed;border-collapse:collapse}
				td.header{height:1px}
				td.article{height:100%;padding:0}
				iframe{width:100%;height:100%;display:block;border:0}`,
			blockContent: `
				table{display:block;width:100%;height:100%;position:relative}
				tbody,tr{display:block;width:100%}
				td.header{display:block;width:100%}
				td.article{display:block;width:100%;position:absolute;top:32px;bottom:0;left:0}
				iframe{width:100%;height:100%;display:block;border:0}`,
		};

		const results: any = {};
		for (const name in variants) {
			const host = document.createElement('div');
			host.style.cssText = 'position:absolute;left:0;top:0;width:180px;height:250px;';
			host.innerHTML = `<table><tbody><tr><td class="header" style="background:#ccc"><div style="height:32px">h</div></td></tr><tr><td class="article"><iframe></iframe></td></tr></tbody></table>`;
			const style = document.createElement('style');
			style.textContent = variants[name];
			document.body.appendChild(style);
			document.body.appendChild(host);
			const table = host.querySelector('table') as HTMLElement;
			const header = host.querySelector('td.header') as HTMLElement;
			const article = host.querySelector('td.article') as HTMLElement;
			const iframe = host.querySelector('iframe') as HTMLElement;
			results[name] = {
				table: table.getBoundingClientRect().height,
				header: header.getBoundingClientRect().height,
				articleTop: article.getBoundingClientRect().top - host.getBoundingClientRect().top,
				article: article.getBoundingClientRect().height,
				iframe: iframe.getBoundingClientRect().height,
				hostBottom: host.getBoundingClientRect().bottom,
				articleBottom: article.getBoundingClientRect().bottom,
				iframeBottom: iframe.getBoundingClientRect().bottom,
			};
			host.remove();
			style.remove();
		}
		return results;
	});
	console.log(JSON.stringify(out, null, 2));
});
