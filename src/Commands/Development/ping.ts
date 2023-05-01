import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';

const ping: Command = {
	name: 'ping',
	description: 'Displays Pong in chat',
	usage: '!ping',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const display = msg.userInfo.displayName;
		// Implementation goes here
		const chatClient = await getChatClient();
		await chatClient.say(channel, `${display}, Im online and working correctly`);
	},
};

export default ping;