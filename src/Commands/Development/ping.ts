import { ChatMessage } from '@twurple/chat/lib';
import axios from 'axios';
import { getChatClient } from '../../chat';
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
			await chatClient.say(channel, 'Im online and working correctly');
		} catch (error) {
			console.error(error);
		}
	},
};

export default ping;
