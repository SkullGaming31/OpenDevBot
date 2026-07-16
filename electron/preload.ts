import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('twitchApi', {
	signup: (type: 'user' | 'bot' = 'user') => ipcRenderer.send('twitch:signup', type),
	onSignupComplete: (callback: (result: unknown) => void) =>
		ipcRenderer.on('twitch:signupComplete', (_event, result) => callback(result))
});

contextBridge.exposeInMainWorld('adminApi', {
	fetch: (path: string, opts?: { method?: string; body?: string }) =>
		ipcRenderer.invoke('admin:fetch', path, opts)
});

contextBridge.exposeInMainWorld('logsApi', {
	openWindow: () => ipcRenderer.send('logs:open'),
	getHistory: () => ipcRenderer.invoke('logs:getHistory'),
	onNewLog: (callback: (entry: { level: string; message: string; timestamp: string }) => void) =>
		ipcRenderer.on('logs:new', (_event, entry) => callback(entry))
});