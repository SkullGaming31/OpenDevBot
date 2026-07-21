import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import * as economyService from '../../services/economyService';
import balanceAdapter from '../../services/balanceAdapter';

const bank: Command = {
	name: 'bank',
	description: 'Bank operations: balance, deposit, withdraw, transfer',
	usage: '!bank <balance|deposit|withdraw|transfer> [args] ',
	cooldown: 2,
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		void text;
		const chatClient = await getChatClient();
		const username = user.toLowerCase();
		const channelId = msg.channelId;
		const sub = args[0]?.toLowerCase() || 'balance';

		try {
			// helper to resolve a target to the key used by BankAccount/economyService
			const resolveKey = async (name: string) => {
				// if it's the invoking user, prefer their numeric id
				if (name === username && msg.userInfo?.userId) return msg.userInfo.userId;
				const { UserModel } = await import('../../database/models/userModel');
				const doc = await UserModel.findOne({ username: name });
				if (doc?.id) return doc.id;
				return name; // fallback to username
			};
			if (sub === 'balance') {
				// Show bank account (persistent) and wallet (legacy) balances.
				// Prefer numeric Twitch id when available to match where adapters store by id.
				const targetArg = args[1] ? args[1].replace(/^@/, '').toLowerCase() : undefined;
				const targetUsername = targetArg || username;
				const { UserModel } = await import('../../database/models/userModel');

				// Resolve numeric id from UserModel if possible (for other users)
				let resolvedId: string | undefined;
				if (targetArg) {
					const maybe = await UserModel.findOne({ username: targetArg });
					if (maybe?.id) resolvedId = maybe.id;
				}

				// For the requester prefer msg.userInfo.userId when present
				if (!resolvedId && targetUsername === username && msg.userInfo?.userId) {
					resolvedId = msg.userInfo.userId;
				}

				const acct = await balanceAdapter.getOrCreate(resolvedId || targetUsername);
				// Wallet: prefer lookup via adapter
				const wallet = await (await import('../../services/balanceAdapter')).getWalletBalance(resolvedId || targetUsername, targetUsername, channelId);

				return chatClient.say(channel, `@${user}, bank: ${acct.balance?.bank ?? 0} | wallet: ${wallet}`);
			}

			if (sub === 'deposit') {
				// usage: !bank deposit 100 [target]
				const amount = Number(args[1]);
				if (!amount || amount <= 0) return chatClient.say(channel, `@${user}, invalid amount.`);
				const target = args[2] ? args[2].replace(/^@/, '').toLowerCase() : username;

				// If depositing to someone else, require moderator
				if (target !== username && !msg.userInfo?.isMod && !msg.userInfo?.isBroadcaster) {
					return chatClient.say(channel, `@${user}, you don't have permission to deposit into other accounts.`);
				}

				const key = await resolveKey(target);

				// If user is depositing from their wallet into their bank
				if (target === username) {
					try {
						// Atomically debit the user's wallet via adapter
						const userKey = msg.userInfo?.userId ?? username;
						const debited = await (await import('../../services/balanceAdapter')).debitWallet(userKey, amount, username, channelId);
						if (!debited) return chatClient.say(channel, `@${user}, insufficient wallet funds.`);

						// Now credit the bank
						await economyService.deposit(key, amount);
						return chatClient.say(channel, `@${user}, deposited ${amount} to your bank.`);
					} catch (err: unknown) {
						const message = err instanceof Error ? err.message : String(err);
						return chatClient.say(channel, `@${user}, deposit failed: ${message}`);
					}
				} else {
					// Moderator depositing into another user's bank (no wallet deduction)
					await economyService.deposit(key, amount);
					return chatClient.say(channel, `@${user}, deposited ${amount} to ${target}.`);
				}
			}

			if (sub === 'withdraw') {
				// usage: !bank withdraw 50 [target]
				const amount = Number(args[1]);
				if (!amount || amount <= 0) return chatClient.say(channel, `@${user}, invalid amount.`);
				const target = args[2] ? args[2].replace(/^@/, '').toLowerCase() : username;

				// If withdrawing from someone else, require moderator
				if (target !== username && !msg.userInfo?.isMod && !msg.userInfo?.isBroadcaster) {
					return chatClient.say(channel, `@${user}, you don't have permission to withdraw from other accounts.`);
				}

				try {
					const key = await resolveKey(target);
					// Withdraw from bank account
					await economyService.withdraw(key, amount);

					// Credit wallet via adapter (now stored in BankAccount.wallet)
					if (msg.userInfo?.userId && target === username) {
						await (await import('../../services/balanceAdapter')).creditWallet(msg.userInfo.userId, amount, username, channelId);
					} else {
						// try to find id for target user via UserModel to prefer id-keyed account
						const { UserModel } = await import('../../database/models/userModel');
						const targetDoc = await UserModel.findOne({ username: target });
						if (targetDoc?.id) {
							await (await import('../../services/balanceAdapter')).creditWallet(targetDoc.id, amount, target, channelId);
						} else {
							await (await import('../../services/balanceAdapter')).creditWallet(target, amount, target, channelId);
						}
					}

					return chatClient.say(channel, `@${user}, withdrew ${amount} from bank and added to wallet.`);
				} catch (err: unknown) {
					const message = err instanceof Error ? err.message : String(err);
					return chatClient.say(channel, `@${user}, failed to withdraw: ${message}`);
				}
			}

			if (sub === 'transfer') {
				// usage: !bank transfer @target 25
				const rawTarget = args[1];
				const amount = Number(args[2]);
				if (!rawTarget || !amount || amount <= 0) return chatClient.say(channel, `@${user}, usage: !bank transfer @user amount`);
				const target = rawTarget.replace(/^@/, '').toLowerCase();
				try {
					const fromKey = await resolveKey(username);
					const toKey = await resolveKey(target);
					await economyService.transfer(fromKey, toKey, amount);
					return chatClient.say(channel, `@${user}, transferred ${amount} to ${target}.`);
				} catch (err: unknown) {
					const message = err instanceof Error ? err.message : String(err);
					return chatClient.say(channel, `@${user}, transfer failed: ${message}`);
				}
			}

			return chatClient.say(channel, `@${user}, unknown subcommand. ${bank.usage}`);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			return chatClient.say(channel, `@${user}, error: ${message}`);
		}
	}
};

export default bank;
