import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';

const balance: Command = {
	name: 'balance',
	description: 'Legacy balance command (redirect)',
	execute: async (channel: string, user: string, args: string[], text: string, msg: unknown) => {
		const client = await getChatClient();
		return client.say(channel, `@${user}, the !balance command has moved — use !bank balance or just !bank to view balances.`);
	}
};

export default balance;
