import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import logger from '../../util/logger';
import type { IBankAccount } from '../../database/models/bankAccount';

const fixbalance: Command = {
	name: 'fixbalance',
	description: 'DEV: normalize BankAccount.balance for a user (convert numeric -> {bank,wallet})',
	usage: '!fixbalance <user|id>',
	moderator: true,
	cooldown: 1,
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		void text;
		const chatClient = await getChatClient();
		const target = args[0] ? args[0].replace(/^@/, '').toLowerCase() : user.toLowerCase();
		try {
			const BankAccount = (await import('../../database/models/bankAccount')).default;
			// try by userId first, then username
			let doc = (await BankAccount.findOne({ userId: target }).lean()) as Partial<IBankAccount> | null;
			if (!doc) doc = (await BankAccount.findOne({ username: target }).lean()) as Partial<IBankAccount> | null;
			if (!doc) return chatClient.say(channel, `No BankAccount found for ${target}`);
			const before = (doc as Partial<IBankAccount>).balance as unknown;
			if (typeof before === 'number' || before == null) {
				const normalized = typeof before === 'number' ? { bank: before, wallet: 0 } : { bank: 0, wallet: 0 };
				await BankAccount.updateOne({ _id: (doc as Partial<IBankAccount>)._id }, { $set: { balance: normalized } });
				const after = (await BankAccount.findOne({ _id: (doc as Partial<IBankAccount>)._id }).lean()) as Partial<IBankAccount> | null;
				await chatClient.say(channel, `Normalized BankAccount for ${target}: before=${JSON.stringify(before)} after=${JSON.stringify((after as Partial<IBankAccount>)?.balance)}`);
				logger.info('fixbalance normalized', { target, before, after: (after as Partial<IBankAccount>)?.balance });
			} else {
				await chatClient.say(channel, `BankAccount for ${target} already normalized: ${JSON.stringify(before)}`);
			}
		} catch (err) {
			logger.error('fixbalance error', err as Error);
			await chatClient.say(channel, `Error normalizing BankAccount: ${(err as Error).message}`);
		}
	}
};

export default fixbalance;
