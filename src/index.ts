import { config } from 'dotenv';
config();

import { twitchChat } from './twitchChat';
import { init } from './database';
import { errorHandler } from './Handlers/errorHandler';
import { createApp } from './util/createApp';

async function run() {

	await twitchChat();
	await errorHandler().then(() => { console.log('Error Handler Initialized'); });
	await init();

	createApp();
}
run();