import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { config } from 'dotenv';

config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true } as never);

import createApp from '../src/util/createApp';
import Database from '../src/database';
import logger from '../src/util/logger';
import { registerAdminProxy } from './adminProxy';
import { registerTwitchSignupHandler } from './twitchSignup';
import { registerLogsBridge } from './logsBridge';
import { initializeConstants } from '../src/util/constants';
import { initializeTwitchEventSub } from '../src/EventSubEvents';
import { startRetryWorker } from '../src/EventSub/retryWorker';
import { initializeChat } from '../src/chat';
import { setBroadcaster } from '../src/util/monitorBroadcaster';

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-sandbox');
// Windows-specific: DirectComposition frequently fails to negotiate a
// shared GPU context inside VMs (VMware/Hyper-V/VirtualBox) and RDP
// sessions. This is the switch that actually fixes that failure mode.
app.commandLine.appendSwitch('disable-direct-composition');
// The renderer process itself was crashing (not just the GPU process).
// `in-process-gpu` keeps GPU work inside the browser process instead of a
// separate one, removing the process that was failing to negotiate a
// shared context. `no-sandbox` drops Chromium's renderer sandboxing,
// which is a common crash source when AV/EDR software intercepts
// sandboxed child processes — acceptable here since this window only ever
// loads our own local dashboard.html, never untrusted remote content.
app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('no-sandbox');

let mainWindow: BrowserWindow | null = null;
const PORT = Number(process.env.PORT) || 3000;
// runtime visibility map controlled by renderer
let monitorVisibility: Record<string, boolean> = {};

ipcMain.on('monitor:visibilityUpdate', (_event, map: Record<string, boolean>) => {
	try {
		monitorVisibility = Object.assign({}, monitorVisibility, map || {});
	} catch (err) {
		// ignore
	}
});

/**
 * Resolves the Mongo URI the same way `src/index.ts` does, then connects
 * and starts the bot's existing Express app (OAuth + admin routes) so the
 * dashboard has something local to talk to.
 */
async function bootstrap(): Promise<void> {
	// Default to 'dev' when ENVIRONMENT isn't set in the packaged app.
	// Packaging and installers often run without user env vars; prefer a sensible default
	// but log a warning so packagers/operators can set it explicitly for production.
	const environment = (process.env.ENVIRONMENT as string) || 'dev';
	if (!process.env.ENVIRONMENT) {
		// eslint-disable-next-line no-console
		console.warn('[electron] ENVIRONMENT not set — defaulting to "dev"');
	}

	let mongoURI = '';
	if (environment === 'prod') {
		mongoURI = process.env.DOCKER_URI || '';
	} else {
		// dev/debug and any other non-prod values use DOCKER_URI when present
		mongoURI = process.env.DOCKER_URI || '';
	}

	// Fallback to a sensible local MongoDB URI when none provided in packaged builds.
	if (!mongoURI) {
		// eslint-disable-next-line no-console
		console.warn('[electron] DOCKER_URI / Mongo URI not set — defaulting to mongodb://127.0.0.1:27017/opendevbot');
		mongoURI = 'mongodb://127.0.0.1:27017/opendevbot';
	}

	const database = new Database(mongoURI);
	await database.connect();

	// Mirror the startup sequence from src/index.ts so constants/chat/eventsub
	// are initialized when running under the Electron shell.
	try {
		if (process.env.ENVIRONMENT !== 'test') {
			if (process.env.ENABLE_EVENTSUB) {
				logger.time('Event Sub Initializing (electron)');
				await initializeConstants();
				await initializeTwitchEventSub();
				void startRetryWorker();
				logger.timeEnd('Event Sub Initializing (electron)');
			}

			if (process.env.ENABLE_CHAT) {
				logger.time('Chat Initializing (electron)');
				await initializeConstants();
				await initializeChat();
				logger.timeEnd('Chat Initializing (electron)');
			}
		}
	} catch (err) {
		logger.error('Error during electron initialization of services', err as Error);
		// allow the express app to come up even if service init fails
	}

	createApp().listen(PORT, () => {
		logger.info(`[electron] bot API listening on http://localhost:${PORT}`);
	});
}

function createMainWindow(): void {
	mainWindow = new BrowserWindow({
		width: 1180,
		height: 780,
		minWidth: 900,
		minHeight: 600,
		backgroundColor: '#14121B',
		title: 'OpenDevBot Control Room',
		icon: path.join(__dirname, '..', '..', 'build', 'icon.ico'),
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			contextIsolation: true,
			nodeIntegration: false
		}
	});

	mainWindow.loadFile(path.join(__dirname, '..', '..', 'public', 'admin', 'dashboard.html'));
	// mainWindow.webContents.openDevTools({ mode: 'detach' });
	mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
	try {
		await bootstrap();
	} catch (err) {
		logger.error('Failed to bootstrap bot API for Electron shell', err as Error);
	}

	registerAdminProxy(PORT);
	registerTwitchSignupHandler(PORT);
	registerLogsBridge();
	createMainWindow();

	// Wire monitor broadcaster to send events to any open renderer windows
	setBroadcaster((event, payload) => {
		try {
			const windows = BrowserWindow.getAllWindows();
			// determine normalized event type
			const eventType = (ev?: string) => {
				const s = String(ev || '');
				const parts = s.split(':');
				if (parts.length === 1) return parts[0] || 'unknown';
				if (parts[0] === 'chat') return 'chat';
				if (parts[0].startsWith('eventsub')) return parts[1] || parts[0];
				return parts[1] || parts[0];
			};

			const key = eventType(event);
			if (monitorVisibility && monitorVisibility[key] === false) return; // filtered

			for (const w of windows) {
				w.webContents.send('monitor:new', { event, payload, timestamp: new Date().toISOString() });
			}
		} catch (err) {
			logger.warn('Failed to broadcast monitor event to renderer', err as Error);
		}
	});

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit();
});