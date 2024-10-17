import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { UserModel } from '../../database/models/userModel';
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

			// Purge the balance of all users
			if (targetUser === 'all') {
				await UserModel.updateMany({ channelId }, { $set: { balance: 0 } });
				await chatClient.say(channel, 'All user balances have been purged.');
			} else {
				// Purge the balance of the specified user
				await UserModel.updateOne({ channelId, username: targetUser }, { $set: { balance: 0 } });
				await chatClient.say(channel, `@${targetUser}'s balance has been purged.`);
			}
		} catch (error) {
			console.error('Error purging balances:', error);
			await chatClient.say(channel, 'An error occurred while trying to purge balances.');
		}
	},
};

export default purgebalance;