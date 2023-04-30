import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';

const pingCommand: Command = {
	name: 'ping',
	description: 'Ping the chatbot to check if it is online.',
	usage: '!ping',
	execute: async (channel: string, user: string, text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		await chatClient.say(channel, 'Pong!');
	}
};

export default pingCommand;