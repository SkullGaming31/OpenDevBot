import { PrivateMessage } from '@twurple/chat/lib';
import { randomInt } from 'node:crypto';
import { getChatClient } from '../../chat';
import UserModel, { User } from '../../database/models/userModel';
import { Command } from '../../interfaces/apiInterfaces';
/**
 * Bug: Not deducting correct amount when losing, FIXED
 */
const gamble: Command = {
	name: 'gamble',
	description: 'Gamble your coins and have a chance to win more',
	usage: '!gamble <amount>',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		const username = user.toLowerCase();
		try {
			// Extract the amount from the command arguments
			const amount = parseInt(args[0]);

			// Perform validation and checks
			if (isNaN(amount)) { return chatClient.say(channel, `Please provide a valid amount for gambling. Usage: ${gamble.usage}`); }

			// Retrieve the user from the database
			let userModel: User | null;
			try {
				userModel = await UserModel.findOne<User>({ username }).exec();
			} catch (error) {
				console.error('Error retrieving user from database:', error);
				await chatClient.say(channel, 'An error occurred while retrieving user information.');
				return;
			}
			if (userModel?.balance === undefined) return;
			// Check if the user exists and has enough coins to gamble
			if (!userModel || amount > userModel.balance) return chatClient.say(channel, 'You do not have enough coins to gamble.');

			// Perform the gambling logic
			const isWin = randomInt(1, 11) <= 3; // Example: 30% chance of winning
			console.log(isWin);
			if (isWin) {
				const winnings = isWin ? amount * 2 : 0;
				const nextBalance = userModel.balance - amount + winnings;// Subtract the bet amount before doubling as winnings
				userModel.balance = nextBalance;
				await chatClient.say(channel, `Congratulations ${user}! You won ${winnings} coins.`);
			} else {
				await chatClient.say(channel, `${user}, better luck next time! You lost ${amount} coins.`);
				// Deduct the amount from the user's balance
				userModel.balance -= amount;
				console.log(userModel.balance);
			}
			// Save the updated user information back to the database
			await userModel.save();
		} catch (error) {
			console.error('Error saving user information:', error);
			await chatClient.say(channel, 'An error occurred while updating user information.');
		}
	}
};

export default gamble;