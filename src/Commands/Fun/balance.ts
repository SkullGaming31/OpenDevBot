import { Command } from '../../interfaces/Command';

const balance: Command = {
	name: 'balance',
	description: 'Deprecated. Use !bank to view balances (bank + wallet).',
	usage: '!bank [balance|deposit|withdraw|transfer] ...',
	aliases: ['bal', 'points', 'coins'],
	execute: async (channel: string, user: string) => {
		// Simple redirect message
		const chat = (await import('../../chat')).getChatClient();
		const client = await chat;
		return client.say(channel, `@${user}, the !balance command has moved — use !bank balance or just !bank to view balances.`);
	}
};

export default balance;