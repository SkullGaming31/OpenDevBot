import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import logger from '../../util/logger';
import * as economyService from '../../services/economyService';

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

			const bank = await economyService.getOrCreateAccount(key as string).catch(() => null);
			const walletById = id ? await UserModel.findOne({ id }) : null;
			const walletByName = !walletById ? await UserModel.findOne({ username: target }) : null;

			const wallet = walletById || walletByName;

			const bankMsg = bank ? `bank(${key}): ${bank.balance}` : 'bank: <none>';
			const walletMsg = wallet ? `wallet(${wallet.id || wallet.username}): ${wallet.balance ?? 0}` : 'wallet: <none>';

			await chatClient.say(channel, `DEBUG ${target} -> ${bankMsg} | ${walletMsg}`);
			logger.debug('DEBUGBALANCE', { target, key, bank, wallet });
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			logger.error('debugbalance error', err as Error);
			await chatClient.say(channel, `Error inspecting balances: ${message}`);
		}
	}
};

export default debugbalance;
