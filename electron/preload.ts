import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('twitchApi', {
	signup: (type: 'user' | 'bot' = 'user') => ipcRenderer.send('twitch:signup', type),
	onSignupComplete: (callback: (signup: { type: 'user' | 'bot'; result: unknown }) => void) =>
		ipcRenderer.on('twitch:signupComplete', (_event, signup) => callback(signup))
});

contextBridge.exposeInMainWorld('adminApi', {
	fetch: (path: string, opts?: { method?: string; body?: string }) =>
		ipcRenderer.invoke('admin:fetch', path, opts?.method, opts?.body)
	,
	setToken: (token?: string) => ipcRenderer.invoke('admin:setToken', token),
	getToken: () => ipcRenderer.invoke('admin:getToken')
});

contextBridge.exposeInMainWorld('monitorApi', {
	onEvent: (callback: (entry: { event: string; payload: unknown; timestamp: string }) => void) =>
		ipcRenderer.on('monitor:new', (_event, entry) => callback(entry))
	,
	setVisibility: (serializedMap: string) => ipcRenderer.send('monitor:visibilityUpdate', serializedMap)
});

contextBridge.exposeInMainWorld('logsApi', {
	openWindow: () => ipcRenderer.send('logs:open'),
	getHistory: () => ipcRenderer.invoke('logs:getHistory'),
	onNewLog: (callback: (entry: { level: string; message: string; timestamp: string }) => void) =>
		ipcRenderer.on('logs:new', (_event, entry) => callback(entry))
});