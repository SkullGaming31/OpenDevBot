import { ChatMessage } from '@twurple/chat/lib';
import axios, { AxiosResponse } from 'axios';
import { getChatClient } from '../../chat';
import { TokenModel } from '../../database/models/tokenModel';
import { Command } from '../../interfaces/apiInterfaces';

axios.defaults;

const ping: Command = {
	name: 'ping',
	description: 'Displays Pong in chat',
	usage: '!ping',
	cooldown: 30000,
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const display = msg.userInfo.displayName;
		const username = user.toLowerCase();
		const chatClient = await getChatClient();

		try {
			if (!msg.userInfo.isBroadcaster) return chatClient.say(channel, 'You do not have the required permission to use this command');
			const pingValue = await checkTwitchApiPing();
			await chatClient.say(channel, `Im online and working correctly, Twitch API Ping: ${pingValue}ms`);
		} catch (error) {
			console.error(error);
		}
	},
};

async function checkTwitchApiPing() {
	const apiEndpoint = 'https://api.twitch.tv/helix/streams';
	const start = Date.now();

	try {
		const tbd = await TokenModel.findOne({ twitchId: '31124455' });
		const response: AxiosResponse = await axios.get(apiEndpoint, { headers: { 
			Authorization: `Bearer ${tbd?.access_token}`,
			'Client-ID': process.env.TWITCH_CLIENT_ID as string
		} 
		});
		const end = Date.now();
		const ping = end - start;

		console.log(`Twitch API Ping: ${ping} ms`);
		return ping;
	} catch (error) {
		console.error('Error:', error);
		throw error; // Rethrow the error to be caught in the calling function
	}
}

export default ping;
