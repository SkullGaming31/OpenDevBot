import { BrowserWindow, ipcMain, IpcMainEvent } from 'electron';
import logger from '../src/util/logger';

/**
 * Opens the Twitch OAuth flow in a child window. Twitch redirects back to
 * the bot's own `/api/v1/auth/twitch/callback` route (already running on
 * `port`), which exchanges the code for a token and saves it to Mongo.
 * This just watches for that navigation, reads the JSON it returns, and
 * reports the result back to whichever renderer asked for it.
 */
function openTwitchSignup(port: number, type: 'user' | 'bot', onComplete: (result: unknown) => void): void {
  const win = new BrowserWindow({
    width: 500,
    height: 720,
    title: 'Sign in with Twitch',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadURL(`http://localhost:${port}/api/v1/twitch?type=${encodeURIComponent(type)}`);

  win.webContents.on('did-navigate', async (_event, url) => {
    if (!url.includes('/api/v1/auth/twitch/callback')) return;

    try {
      const body = await win.webContents.executeJavaScript('document.body.innerText');
      onComplete(JSON.parse(body));
    } catch (err) {
      logger.error('Failed to parse Twitch callback result', err as Error);
      onComplete({ error: 'Failed to complete sign-up' });
    } finally {
      if (!win.isDestroyed()) win.close();
    }
  });
}

export function registerTwitchSignupHandler(port: number): void {
  ipcMain.on('twitch:signup', (event: IpcMainEvent, type: 'user' | 'bot' = 'user') => {
    openTwitchSignup(port, type, (result) => {
      if (!event.sender.isDestroyed()) event.sender.send('twitch:signupComplete', result);
    });
  });
}