import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { UserModel } from '../../database/models/userModel';
import { Command } from '../../interfaces/Command';

const balance: Command = {
	name: 'balance',
	description: 'Get the balance for your account',
	usage: '!balance',
	aliases: ['bal', 'points', 'coins'],
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const username = user.toLowerCase();
		const channelId = msg.channelId;

		const userDoc = await UserModel.findOne({ channelId, username });
		const balance = userDoc?.balance || 0;
		await chatClient.say(channel, `@${user}, your balance is ${balance} coins.`);
	}
};

export default balance;
