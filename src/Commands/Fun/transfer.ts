import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { IUser, UserModel } from '../../database/models/userModel';
import { Command } from '../../interfaces/Command';

const transfer: Command = {
	name: 'transfer',
	description: 'Transfer money to another person',
	usage: '!transfer [@name] [amount]',
	/**
	 * Transfer gold from one user to another.
	 *
	 * @remarks
	 * This command will decrement the sender's balance and increment the recipient's balance.
	 * It will also perform some error checking to ensure that the sender has enough gold
	 * and that the recipient exists.
	 *
	 * @param channel - The channel where the command was issued.
	 * @param user - The user who issued the command.
	 * @param args - The command arguments, which should include the recipient and amount.
	 * @param text - The full text of the message.
	 * @param msg - The chat message object containing metadata and user information.
	 */
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

			// Decrement sender balance
			const updatedSenderDoc = await UserModel.findOneAndUpdate<IUser>(
				{ username: sender.toLowerCase(), channelId: msg.channelId },
				{
					$inc: { balance: -parsedAmount },
				},
				{ new: true }
			);
			if (updatedSenderDoc?.balance === undefined) return;

			// Increment recipient balance
			if (!updatedSenderDoc) {
				return chatClient.say(channel, `@${user}, you don't have a gold balance.`);
			}
			if (updatedSenderDoc.balance < 0) { // Ensure balance is not negative
				return chatClient.say(channel, `@${user}, you don't have enough gold to make this transfer.`);
			}

			const recipientDoc = await UserModel.findOneAndUpdate<IUser>(
				{ username: recipient.toLowerCase(), channelId: msg.channelId },
				{ $inc: { balance: parsedAmount } },
				{ new: true }
			);

			if (recipientDoc) {
				await chatClient.say(channel, `@${user}, you have transferred ${parsedAmount} gold to ${recipientDoc.username}.`);
			} else {
				await chatClient.say(channel, `@${user}, recipient not found.`);
				throw new Error(`Recipient not found: ${recipient}`);
			}

		} catch (error) {
			console.error(error);
		}
	}
};
export default transfer;