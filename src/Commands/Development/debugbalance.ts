import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import logger from '../../util/logger';
import BankAccount from '../../database/models/bankAccount';

const debugbalance: Command = {
	name: 'debugbalance',
	description: 'DEV: show bank and wallet records for a user (dev/mod only)',
	usage: '!debugbalance [@user]',
	moderator: true,
	cooldown: 1,
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		void text;
		const chatClient = await getChatClient();
		const target = args[0] ? args[0].replace(/^@/, '').toLowerCase() : user.toLowerCase();
		const { UserModel } = await import('../../database/models/userModel');
		try {
			// Try to resolve numeric id first
			const userDoc = await UserModel.findOne({ username: target });
			const id = userDoc?.id || (msg.userInfo?.userName === target ? msg.userInfo?.userId : undefined) || undefined;
			const key = id || target;

			// BankAccount holds normalized { bank, wallet } object. UserModel may have legacy numeric balance.
			const bankDoc = await BankAccount.findOne({ userId: key as string }) || await BankAccount.findOne({ username: target });
			const bankMsg = bankDoc ? `bank(${bankDoc.userId || key}): ${bankDoc.balance?.bank ?? 0} / ${bankDoc.balance?.wallet ?? 0}` : 'bank: <none>';

			// UserModel numeric `balance` is deprecated — show only BankAccount normalized values
			await chatClient.say(channel, `DEBUG ${target} -> ${bankMsg} | usermodel: deprecated`);
			logger.debug('DEBUGBALANCE', { target, key, bankDoc });
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			logger.error('debugbalance error', err as Error);
			await chatClient.say(channel, `Error inspecting balances: ${message}`);
		}
	}
};

export default debugbalance;
