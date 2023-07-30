import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { UserModel } from '../../database/models/userModel';
import { Command } from '../../interfaces/apiInterfaces';

const balance: Command = {
	name: 'balance',
	description: 'Get the balance for your account',
	usage: '!balance',
	aliases: ['bal', 'points'],
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const username = user.toLowerCase();
		const userDoc = await UserModel.findOne({ username });
		const balance = userDoc?.balance || 0;
		chatClient.say(channel, `@${user}, your balance is ${balance} coins.`);
	}
};
export default balance;