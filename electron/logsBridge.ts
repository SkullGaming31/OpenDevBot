import { BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { logEvents } from '../src/util/logger';

interface LogEntry {
	level: 'debug' | 'info' | 'warn' | 'error';
	message: string;
	timestamp: string;
}

const RING_BUFFER_SIZE = 500;
const ringBuffer: LogEntry[] = [];
const logsWindows = new Set<BrowserWindow>();

logEvents.on('log', (entry: LogEntry) => {
	ringBuffer.push(entry);
	if (ringBuffer.length > RING_BUFFER_SIZE) ringBuffer.shift();

	for (const win of logsWindows) {
		if (!win.isDestroyed()) win.webContents.send('logs:new', entry);
	}
});

function openLogsWindow(): void {
	// Focus the existing logs window instead of opening a second one
	const existing = [...logsWindows].find((w) => !w.isDestroyed());
	if (existing) {
		existing.focus();
		return;
	}

	const win = new BrowserWindow({
		width: 780,
		height: 560,
		title: 'OpenDevBot — Logs',
		backgroundColor: '#14121B',
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			contextIsolation: true,
			nodeIntegration: false
		}
	});

	win.loadFile(path.join(__dirname, '..', '..', 'public', 'admin', 'logs.html'));
	logsWindows.add(win);
	win.on('closed', () => { logsWindows.delete(win); });
}

export function registerLogsBridge(): void {
	ipcMain.handle('logs:getHistory', () => ringBuffer);
	ipcMain.on('logs:open', () => openLogsWindow());
}