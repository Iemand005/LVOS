import { test, expect } from '@playwright/test';
import { spawn, execFileSync } from 'child_process';
import { once } from 'events';
import { get, type IncomingHttpHeaders, type IncomingMessage } from 'http';
import { readFileSync } from 'fs';
import { brotliDecompressSync, gunzipSync } from 'zlib';
import { resolve } from 'path';

test.setTimeout(120000);

const root = resolve('.');

type RawResponse = { status: number | undefined; headers: IncomingHttpHeaders; body: Buffer };

function request(url: string, acceptEncoding: string): Promise<RawResponse> {
	return new Promise<RawResponse>((resolveRequest, rejectRequest) => {
		get(url, { headers: { 'Accept-Encoding': acceptEncoding } }, (res: IncomingMessage) => {
			const chunks: Buffer[] = [];
			res.on('data', (chunk: Buffer) => chunks.push(chunk));
			res.on('end', () => resolveRequest({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
		}).on('error', rejectRequest);
	});
}

async function waitFor(url: string): Promise<void> {
	for (let attempt = 0; attempt < 100; attempt++) {
		try {
			const response = await request(url, 'identity');
			if (response.status === 200) return;
		} catch {}
		await new Promise<void>((done) => setTimeout(done, 200));
	}
	throw new Error(`Server did not start: ${url}`);
}

test('vite dev and preview negotiate compressed unity.html', async () => {
	execFileSync(process.execPath, ['build.js', '--unity', '--no-assets'], { cwd: root });
	const html = readFileSync(resolve(root, 'Dist/unity.html')).toString();
	const servers = [
		{ args: ['node_modules/vite/bin/vite.js', '--port', '3721'], url: 'http://127.0.0.1:3721/unity.html' },
		{ args: ['node_modules/vite/bin/vite.js', 'preview', '--port', '3722'], url: 'http://127.0.0.1:3722/unity.html' }
	];

	for (const { args, url } of servers) {
		const server = spawn(process.execPath, args, { cwd: root, stdio: 'ignore' });
		try {
			await waitFor(url);
			const br = await request(url, 'br, gzip');
			expect(br.status).toBe(200);
			expect(br.headers['content-encoding']).toBe('br');
			expect(br.headers['vary']).toBe('Accept-Encoding');
			expect(brotliDecompressSync(br.body).toString()).toBe(html);

			const gz = await request(url, 'gzip');
			expect(gz.status).toBe(200);
			expect(gz.headers['content-encoding']).toBe('gzip');
			expect(gunzipSync(gz.body).toString()).toBe(html);

			const plain = await request(url, 'identity');
			expect(plain.status).toBe(200);
			expect(plain.headers['content-encoding']).toBeUndefined();
			expect(plain.body.toString()).toBe(html);

			if (!args.includes('preview')) {
				const distPath = await request(url.replace('/unity.html', '/Dist/unity.html'), 'br, gzip');
				expect(distPath.headers['content-encoding']).toBe('br');
			}
		} finally {
			server.kill('SIGTERM');
			await Promise.race([once(server, 'exit'), new Promise((done) => setTimeout(done, 2000))]);
		}
	}
});
