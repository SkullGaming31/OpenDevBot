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
				// Wallet: prefer lookup by id if resolved, otherwise by username
				let userDoc;
				if (resolvedId) userDoc = await UserModel.findOne({ id: resolvedId });
				else userDoc = await UserModel.findOne({ username: targetUsername });
				const wallet = userDoc?.balance || 0;

				return chatClient.say(channel, `@${user}, bank: ${acct.balance} | wallet: ${wallet}`);
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
						const { UserModel } = await import('../../database/models/userModel');
						// Prefer numeric id when available
						if (msg.userInfo?.userId) {
							// Atomically decrement wallet only if sufficient funds
							const updated = await UserModel.findOneAndUpdate(
								{ id: msg.userInfo.userId, balance: { $gte: amount } },
								{ $inc: { balance: -amount } },
								{ new: true }
							);
							if (!updated) return chatClient.say(channel, `@${user}, insufficient wallet funds.`);
						} else {
							// fallback to username+channelId
							const updated = await UserModel.findOneAndUpdate(
								{ username, channelId, balance: { $gte: amount } },
								{ $inc: { balance: -amount } },
								{ new: true }
							);
							if (!updated) return chatClient.say(channel, `@${user}, insufficient wallet funds.`);
						}

						// Now credit the bank
						await economyService.deposit(key, amount);
						return chatClient.say(channel, `@${user}, deposited ${amount} to your bank.`);
					} catch (err: any) {
						return chatClient.say(channel, `@${user}, deposit failed: ${err.message}`);
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

					// Credit wallet (legacy UserModel) by id when possible
					const { UserModel } = await import('../../database/models/userModel');
					if (msg.userInfo?.userId && target === username) {
						await UserModel.updateOne({ id: msg.userInfo.userId }, { $inc: { balance: amount }, $setOnInsert: { username } }, { upsert: true });
					} else {
						// try to find id for target user
						const targetDoc = await UserModel.findOne({ username: target });
						if (targetDoc?.id) {
							await UserModel.updateOne({ id: targetDoc.id }, { $inc: { balance: amount } }, { upsert: true });
						} else {
							await UserModel.updateOne({ username: target }, { $inc: { balance: amount }, $setOnInsert: { username: target } }, { upsert: true });
						}
					}

					return chatClient.say(channel, `@${user}, withdrew ${amount} from bank and added to wallet.`);
				} catch (err: any) {
					return chatClient.say(channel, `@${user}, failed to withdraw: ${err.message}`);
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
				} catch (err: any) {
					return chatClient.say(channel, `@${user}, transfer failed: ${err.message}`);
				}
			}

			return chatClient.say(channel, `@${user}, unknown subcommand. ${bank.usage}`);
		} catch (err: any) {
			return chatClient.say(channel, `@${user}, error: ${err.message}`);
		}
	}
};

export default bank;
