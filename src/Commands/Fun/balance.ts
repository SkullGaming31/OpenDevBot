import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { UserModel } from '../../database/models/userModel';
import { Command } from '../../interfaces/Command';

const balance: Command = {
	name: 'balance',
	description: 'Get the balance for your account or another user\'s account if you are a mod or broadcaster',
	usage: '!balance [@username]',
	aliases: ['bal', 'points', 'coins'],
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
		const balance = userDoc?.balance || 0;

		// Send the balance message
		await chatClient.say(channel, `@${user}, ${targetUser === user.toLowerCase() ? 'your' : `${targetUser}'s`} balance is ${balance} coins.`);
	}
};
export default balance;