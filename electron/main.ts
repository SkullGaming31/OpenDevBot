import { app, BrowserWindow } from 'electron';
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

/**
 * Resolves the Mongo URI the same way `src/index.ts` does, then connects
 * and starts the bot's existing Express app (OAuth + admin routes) so the
 * dashboard has something local to talk to.
 */
async function bootstrap(): Promise<void> {
	const environment = process.env.ENVIRONMENT as string;
	let mongoURI = '';

	switch (environment) {
		case 'prod':
			mongoURI = process.env.DOCKER_URI || '';
			break;
		case 'debug':
		case 'dev':
			mongoURI = process.env.DOCKER_URI || '';
			break;
		default:
			throw new Error(`Unknown environment: ${environment}`);
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

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit();
});