import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import BankAccount from '../../database/models/bankAccount';
import TransactionLog from '../../database/models/transactionLog';
import { Command } from '../../interfaces/Command';

const purgebalance: Command = {
	name: 'purgebalance',
	description: 'Purge a user\'s balance or everyone\'s balance',
	usage: '!purgebalance [@username | all]',
	/**
	 * Determine the target user(s) to purge. 
	 * Purge all users' balances if 'all' is specified or no specific user is mentioned. 
	 * If a specific user is mentioned, purge the balance of that user.
	 * 
	 * @param channel - The channel where the command was issued.
	 * @param user - The user who issued the command.
	 * @param args - The command arguments, including the target user(s) to purge.
	 * @param text - The full text of the chat message.
	 * @param msg - The chat message object containing metadata and user information.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const channelId = msg.channelId;

		try {
			// Determine the target user(s) to purge
			const targetUser = args.length > 0 ? args[0].replace('@', '').toLowerCase() : 'all';

			if (targetUser === 'all') {
				const res = await BankAccount.updateMany({}, { $set: { balance: 0 } });
				const count = (res as any)?.modifiedCount ?? (res as any)?.nModified ?? 0;
				// Log admin purge
				await TransactionLog.create([{ type: 'withdraw', from: 'system', to: 'all', amount: 0, meta: { admin: { id: msg.userInfo.userId, name: msg.userInfo.displayName }, action: 'purge_all', count } }]);
				await chatClient.say(channel, `All user balances have been purged. (${count} accounts updated)`);
			} else {
				// Purge the balance of the specified user
				await BankAccount.updateOne({ userId: targetUser }, { $set: { balance: 0 } });
				await TransactionLog.create([{ type: 'withdraw', from: 'system', to: targetUser, amount: 0, meta: { admin: { id: msg.userInfo.userId, name: msg.userInfo.displayName }, action: 'purge_user' } }]);
				await chatClient.say(channel, `@${targetUser}'s balance has been purged.`);
			}
		} catch (error) {
			console.error('Error purging balances:', error);
			await chatClient.say(channel, 'An error occurred while trying to purge balances.');
		}
	},
};

export default purgebalance;