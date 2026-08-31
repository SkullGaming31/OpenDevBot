import { ipcMain } from 'electron';
import logger from '../src/util/logger';

interface AdminFetchOptions {
	method?: string;
	body?: string;
}

/**
 * Proxies admin API calls from the renderer to the bot's local Express
 * server, attaching `x-admin-token` on the main-process side so the
 * renderer (and dashboard.html) never sees the token.
 */
export function registerAdminProxy(port: number): void {
	logger.info('[electron] adminProxy configured');

	// In-memory override token that can be set from the renderer via IPC.
	let overrideAdminToken: string | undefined;

	ipcMain.handle('admin:setToken', async (_event, token: string | undefined) => {
		overrideAdminToken = token && token.length ? String(token) : undefined;
		logger.info('[electron] admin token updated from renderer (in-memory)');
		return true;
	});

	ipcMain.handle('admin:getToken', async () => {
		return overrideAdminToken || process.env.ADMIN_API_TOKEN || '';
	});

	ipcMain.handle('admin:fetch', async (_event, path: string, opts: AdminFetchOptions = {}) => {
		const maxAttempts = 3;
		let attempt = 0;
		const token = overrideAdminToken || process.env.ADMIN_API_TOKEN || '';

		while (attempt < maxAttempts) {
			attempt++;
			try {
				const res = await fetch(`http://localhost:${port}${path}`, {
					method: opts.method || 'GET',
					headers: {
						'Content-Type': 'application/json',
						'x-admin-token': token
					},
					body: opts.body
				});

				if (res.ok) {
					const ct = (res.headers.get('content-type') || '').toLowerCase();
					if (ct.includes('application/json')) return await res.json();
					// Try to parse body as JSON, otherwise return raw text
					const text = await res.text();
					try { return JSON.parse(text); } catch { return text; }
				}

				// Handle 429 with retry/backoff when possible
				if (res.status === 429 && attempt < maxAttempts) {
					const retryAfter = res.headers.get('retry-after');
					let wait = 1000 * Math.pow(2, attempt - 1); // 1s, 2s, 4s
					if (retryAfter) {
						const ra = Number(retryAfter);
						if (!Number.isNaN(ra)) wait = ra * 1000;
					}
					logger.warn(`admin:fetch ${path} returned 429; retrying in ${wait}ms (attempt ${attempt}/${maxAttempts})`);
					await new Promise((r) => setTimeout(r, wait));
					continue;
				}

				// Non-OK response: read body and surface a clear error
				const bodyText = await res.text();
				// If body is JSON, return parsed object to preserve existing behaviour
				try {
					const parsed = JSON.parse(bodyText);
					return parsed;
				} catch {
					logger.warn(`admin:fetch ${path} returned ${res.status} ${res.statusText}`);
					throw new Error(`HTTP ${res.status} ${res.statusText}: ${bodyText}`);
				}
			} catch (err) {
				// Network or parsing error — retry a few times before failing
				if (attempt >= maxAttempts) {
					logger.error(`admin:fetch proxy failed for ${path}`, err as Error);
					throw err;
				}
				const wait = 500 * attempt;
				logger.warn(`admin:fetch transient error for ${path}, retrying in ${wait}ms (attempt ${attempt}/${maxAttempts})`, err as Error);
				await new Promise((r) => setTimeout(r, wait));
			}
		}

		// If we exit the retry loop without returning, surface a clear error
		const errMsg = `admin:fetch proxy failed for ${path} after ${maxAttempts} attempts`;
		logger.error(errMsg);
		throw new Error(errMsg);
	});
}