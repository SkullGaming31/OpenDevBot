import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { UserModel } from '../../database/models/userModel';
import { Command } from '../../interfaces/apiInterfaces';

const transfer: Command = {
	name: 'transfer',
	description: 'Transfer money to another person',
	usage: '!transfer [@name] [amount]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		const [_, recipient, amount] = text.split(' ');
		const sender = user.toLowerCase();
		const parsedAmount = parseInt(amount, 10);

		if (!args[0]) return chatClient.say(channel, `Usage: ${transfer.usage}`);
		if (isNaN(parsedAmount)) return chatClient.say(channel, `@${user}, please specify a valid amount.`);
		if (parsedAmount <= 0) return chatClient.say(channel, `@${user}, you can only transfer positive amounts.`);

		const senderDoc = await UserModel.findOne({ username: sender });
		if (!senderDoc || senderDoc.balance < parsedAmount) {
			return chatClient.say(channel, `@${user}, you do not have enough gold to make this transfer.`);
		}

		const recipientDoc = await UserModel.findOneAndUpdate(
			{ username: recipient.toLowerCase() },
			{ $inc: { balance: parsedAmount } },
			{ new: true, upsert: true }
		);

		await UserModel.updateOne(
			{ username: sender },
			{ $inc: { balance: -parsedAmount } }
		);

		chatClient.say(channel, `@${user}, you have transferred ${parsedAmount} gold to ${recipientDoc.username}.`);
	}
};
export default transfer;