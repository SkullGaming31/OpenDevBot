import { ChatMessage } from '@twurple/chat/lib';
import { randomInt } from 'node:crypto';
import { getChatClient } from '../../chat';
import { IUser, UserModel } from '../../database/models/userModel';
import { Command } from '../../interfaces/Command';
/**
 * Bug: Not deducting correct amount when losing, FIXED
 */
// ...

// ...

const gamble: Command = {
	name: 'gamble',
	description: 'Gamble your coins and have a chance to win more',
	usage: '!gamble <amount>',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const username = user.toLowerCase();
		try {
			// Retrieve the user from the database
			let userModel: IUser | null;
			try {
				userModel = await UserModel.findOne<IUser>({ username, channelId: msg.channelId }).exec();
			} catch (error) {
				console.error('Error retrieving user from database:', error);
				await chatClient.say(channel, 'An error occurred while retrieving user information.');
				return;
			}

			if (!userModel || userModel.balance === undefined) return;

			// Extract the amount from the command arguments
			let amount: number;

			if (args[0] === 'all') {
				// Gamble all balance
				amount = Math.max(0, userModel?.balance ?? 0); // Ensure amount is positive, even if balance is undefined
			} else if (args[0].endsWith('%')) {
				// Gamble a percentage of the balance
				const percentage = parseInt(args[0].slice(0, -1));
				if (isNaN(percentage) || percentage < 0 || percentage > 100) {
					return chatClient.say(channel, `Please provide a valid percentage for gambling. Usage: ${gamble.usage}`);
				}
				amount = Math.floor((userModel?.balance ?? 0) * (percentage / 100));
			} else {
				// Gamble a specific amount
				amount = parseInt(args[0]);
				if (isNaN(amount)) {
					return chatClient.say(channel, `Please provide a valid amount for gambling. Usage: ${gamble.usage}`);
				}
			}

			// Check if the user has enough coins to gamble
			if (amount > userModel.balance) return chatClient.say(channel, 'You do not have enough coins to gamble.');

			// Perform the gambling logic
			const isWin = randomInt(1, 11) <= 3; // Example: 30% chance of winning
			if (isWin) {
				const winnings = amount * 2;
				const newBalance = userModel.balance + winnings - amount; // Calculate the new balance
				// Enforce non-negative balance (optional)
				userModel.balance = Math.min(0, newBalance); // Set balance to 0 if negative
				await chatClient.say(channel, `Congratulations ${user}! You won ${winnings} coins.`);
			} else {
				await chatClient.say(channel, `${user}, better luck next time! You lost ${amount} coins.`);
				const newBalance = userModel.balance - amount; // Calculate the new balance
				// Enforce non-negative balance (optional)
				userModel.balance = Math.min(0, newBalance); // Set balance to 0 if negative
			}

			// Save the updated user information back to the database
			await userModel.save();
		} catch (error) {
			console.error('Error saving user information:', error);
			await chatClient.say(channel, 'An error occurred while updating user information.');
		}
	},
};

export default gamble;