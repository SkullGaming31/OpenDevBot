import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { config } from 'dotenv';

config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true } as never);

import createApp from '../src/util/createApp';
import { openSqliteDatabase } from '../src/database/sqliteConnection';
import { connectMongoForDevelopment } from '../src/database/mongoDevTools';
import { initializeWebhookQueue } from '../src/Discord/webhookQueue';
import logger, { setApplicationLogFile, setErrorLogFile } from '../src/util/logger';
import { registerAdminProxy } from './adminProxy';
import { registerTwitchSignupHandler } from './twitchSignup';
import { registerLogsBridge } from './logsBridge';
import { initializeConstants } from '../src/util/constants';
import { initializeTwitchEventSub } from '../src/EventSubEvents';
import { startRetryWorker } from '../src/EventSub/retryWorker';
import { initializeChat } from '../src/chat';
import { setBroadcaster } from '../src/util/monitorBroadcaster';
import ErrorHandler from '../src/Handlers/errorHandler';
import { deleteAllInjuries, deleteExpiredInjuries } from '../src/services/injuryCleanup';
import { initMonitoring } from '../src/monitoring';
import { parseMonitorVisibility } from './monitorVisibility';

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

ipcMain.on('monitor:visibilityUpdate', (_event, serializedMap: string) => {
	try {
		const map = parseMonitorVisibility(serializedMap);
		if (!map) {
			logger.warn('[electron] Ignoring invalid monitor visibility update');
			return;
		}
		monitorVisibility = Object.assign({}, monitorVisibility, map);
	} catch (err) {
		logger.warn('[electron] Failed to parse monitor visibility update', err as Error);
	}
});

/**
 * Opens the SQLite application database, optionally connects MongoDB
 * developer tooling in dev/debug environments, and starts the local Express app.
 */
async function bootstrap(): Promise<void> {
	// Packaging and installers may run without user env vars, so default packaged
	// builds to production and local Electron runs to development.
	if (!process.env.ENVIRONMENT) {
		process.env.ENVIRONMENT = app.isPackaged ? 'prod' : 'dev';
		logger.warn(`[electron] ENVIRONMENT not set — defaulting to "${process.env.ENVIRONMENT}"`);
	}

	initMonitoring();
	openSqliteDatabase(path.join(app.getPath('userData'), 'opendevbot.sqlite'));
	await initializeWebhookQueue();
	try {
		await connectMongoForDevelopment();
	} catch (error) {
		logger.error('MongoDB developer tooling failed to connect; SQLite application services remain available', error);
	}

	if (process.env.RESET_INJURIES === 'true') {
		logger.warn('RESET_INJURIES=true: removing all entries from injuries collection (legacy behavior)');
		await deleteAllInjuries();
	} else {
		await deleteExpiredInjuries();
		const cleanupInterval = process.env.INJURY_CLEANUP_INTERVAL_MS
			? Number(process.env.INJURY_CLEANUP_INTERVAL_MS)
			: 24 * 60 * 60 * 1000;
		if (process.env.ENVIRONMENT !== 'test' && cleanupInterval > 0) {
			setInterval(() => { void deleteExpiredInjuries(); }, cleanupInterval);
		}
	}

	try {
		await new ErrorHandler().initialize();
		logger.info('Error Handler initialized (electron)');
	} catch (error) {
		logger.error('Failed to start Error Handler in Electron', error as Error);
	}

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
	const logsDirectory = path.join(app.getPath('userData'), 'logs');
	const applicationLogPath = path.join(logsDirectory, 'opendevbot.log');
	const errorLogPath = path.join(logsDirectory, 'opendevbot-errors.log');
	process.env.DEV_LOG_FILE = errorLogPath;
	process.env.PROD_LOG_FILE = errorLogPath;
	try {
		setApplicationLogFile(applicationLogPath);
		setErrorLogFile(errorLogPath);
		registerLogsBridge();
		logger.info('Persistent Electron logs configured at', applicationLogPath);
	} catch (error) {
		logger.error('Failed to configure persistent Electron logging', error as Error);
	}

	try {
		await bootstrap();
	} catch (err) {
		logger.error('Failed to bootstrap bot API for Electron shell', err as Error);
	}
	registerAdminProxy(PORT);
	registerTwitchSignupHandler(PORT);
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