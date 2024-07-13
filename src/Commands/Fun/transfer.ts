import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { IUser, UserModel } from '../../database/models/userModel';
import { Command } from '../../interfaces/Command';

const transfer: Command = {
	name: 'transfer',
	description: 'Transfer money to another person',
	usage: '!transfer [@name] [amount]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		try {
			const chatClient = await getChatClient();
			const userAPIClient = await getUserApi();
			const [_, recipient, amount] = text.split(' ');
			const sender = user.toLowerCase();
			const parsedAmount = parseInt(amount, 10);

			const userSearch = userAPIClient.users.getUserByName(recipient.substring(1));
			if (userSearch === undefined) return;

			if (!args[0]) return chatClient.say(channel, `Usage: ${transfer.usage}`);
			if (isNaN(parsedAmount)) return chatClient.say(channel, `@${user}, please specify a valid amount.`);
			if (parsedAmount <= 0) return chatClient.say(channel, `@${user}, you can only transfer positive amounts.`);

			// Combine sender balance check and update into a single operation
			const updatedSenderDoc = await UserModel.findOneAndUpdate<IUser>(
				{ username: sender.toLowerCase(), channelId: msg.channelId },
				{
					$inc: { balance: -parsedAmount },// Decrement balance directly
				},
				{ new: true } // Return updated document for checks
			);
			if (updatedSenderDoc?.balance === undefined) return;

			// Handle potential errors with sender balance
			if (!updatedSenderDoc) {
				return chatClient.say(channel, `@${user}, you don't have a gold balance.`);
			}
			if (updatedSenderDoc.balance < 0) { // Ensure balance is not negative
				return chatClient.say(channel, `@${user}, you don't have enough gold to make this transfer.`);
			}

			const recipientDoc = await UserModel.findOneAndUpdate<IUser>({ username: recipient.toLowerCase(), channelId: msg.channelId });
			if (recipientDoc && recipientDoc.balance !== undefined) {
				recipientDoc.balance += parsedAmount;
				recipientDoc.save(); // Updates the saved document
				await chatClient.say(channel, `@${user}, you have transferred ${parsedAmount} gold to ${recipientDoc.username}.`);
			} else {
				// Handle recipient not found
			}

		} catch (error) {
			console.error(error);
		}
	}
};
export default transfer;