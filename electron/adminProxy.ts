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
	const token = process.env.ADMIN_API_TOKEN || '';
	const masked = token ? (token.length > 4 ? `${token.slice(0, 2)}...${token.slice(-2)}` : '***') : '<none>';
	logger.info(`[electron] adminProxy configured, ADMIN_API_TOKEN=${masked}`);

	ipcMain.handle('admin:fetch', async (_event, path: string, opts: AdminFetchOptions = {}) => {
		try {
			const res = await fetch(`http://localhost:${port}${path}`, {
				method: opts.method || 'GET',
				headers: {
					'Content-Type': 'application/json',
					'x-admin-token': process.env.ADMIN_API_TOKEN || ''
				},
				body: opts.body
			});

			if (!res.ok) {
				logger.warn(`admin:fetch ${path} returned ${res.status}`);
			}
			return await res.json();
		} catch (err) {
			logger.error(`admin:fetch proxy failed for ${path}`, err as Error);
			throw err;
		}
	});
}