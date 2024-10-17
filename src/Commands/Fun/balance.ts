import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { UserModel } from '../../database/models/userModel';
import { Command } from '../../interfaces/Command';

const balance: Command = {
	name: 'balance',
	description: 'Get the balance for your account or another user\'s account if you are a mod or broadcaster',
	usage: '!balance [@username]',
	aliases: ['bal', 'points', 'coins'],
	/**
	 * Execute the balance command to fetch and display the balance of a user.
	 * 
	 * @param channel - The channel where the command was issued.
	 * @param user - The user who issued the command.
	 * @param args - The command arguments, which may include a target username.
	 * @param text - The full text of the chat message.
	 * @param msg - The chat message object containing metadata and user information.
	 * 
	 * The function retrieves the balance for the requesting user or another specified user
	 * if the requester has mod or broadcaster privileges. It then sends a message to the 
	 * chat with the balance information.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const channelId = msg.channelId;
		let targetUser = user.toLowerCase();

		// Check if a username is mentioned and if the requester is a mod or the broadcaster
		if (args.length > 0) {
			const mentionedUser = args[0].replace('@', '').toLowerCase();
			const isModOrBroadcaster = msg.userInfo.isMod || msg.userInfo.isBroadcaster;

			// Only change targetUser if the requester is a mod or the broadcaster
			if (isModOrBroadcaster) {
				targetUser = mentionedUser;
			}
		}



		// Fetch the user's balance
		const userDoc = await UserModel.findOne({ channelId, username: targetUser });

		// Log channelId and username
		console.log('Channel ID:', channelId);
		console.log('Username:', targetUser);
		console.log('User Document:', userDoc);
		const balance = userDoc?.balance || 0;

		// Send the balance message
		await chatClient.say(channel, `@${user}, ${targetUser === user.toLowerCase() ? 'your' : `${targetUser}'s`} balance is ${balance} coins.`);
	}
};
export default balance;