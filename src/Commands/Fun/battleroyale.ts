import { Command } from '../../interfaces/Command';
import { getChatClient } from '../../chat';

const balance: Command = {
	name: 'battleroyale',
	description: '',
	usage: '!battleroyale',
	aliases: ['br'],
	moderator: false,
	devOnly: false,
	cooldown: 60,
	execute: async (channel: string, user: string) => {
		// Command in Development

		const chat = await getChatClient();
		return chat.say(channel, `@${user}, This command is currntly in development and will be available soon!`);
	}
};

export default balance;