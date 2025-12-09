import { ChatMessage } from '@twurple/chat/lib';
import { randomInt } from 'node:crypto';
import { getChatClient } from '../../chat';
import balanceAdapter from '../../services/balanceAdapter';
import { Command } from '../../interfaces/Command';
import logger from '../../util/logger';
/**
 * Bug: Not deducting correct amount when losing, FIXED
 */
// ...

// ...

const gamble: Command = {
	name: 'gamble',
	description: 'Gamble your coins and have a chance to win more',
	usage: '!gamble <amount>',
	/**
	 * Executes the gamble command.
	 * 
	 * @param channel - The channel where the command was issued.
	 * @param user - The user who issued the command.
	 * @param args - The command arguments, which may include an amount to gamble.
	 * @param text - The full text of the chat message.
	 * @param msg - The chat message object containing metadata and user information.
	 * 
	 * The function retrieves the user from the database, checks if the user has enough coins to gamble,
	 * performs the gambling logic, and updates the user's balance accordingly. If the user wins, the function
	 * sends a message to the chat with the winnings. If the user loses, the function sends a message with the
	 * amount lost. The function also saves the updated user information back to the database.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		void text;
		const chatClient = await getChatClient();

		const username = user.toLowerCase();
		void username;
		const channelId = msg.channelId;
		void channelId;
		const userKey = msg.userInfo.userId ?? msg.userInfo.userName;
		try {
			// Retrieve or create the bank account for this user via the balance adapter
			let acct;
			try {
				acct = await balanceAdapter.getOrCreate(userKey);
			} catch (error) {
				logger.error('Error retrieving account via balanceAdapter:', error);
				await chatClient.say(channel, 'An error occurred while retrieving your account.');
				return;
			}

			if (!acct || acct.balance === undefined) {
				await chatClient.say(channel, 'Could not find your account or balance. Try again later.');
				return;
			}

			// Ensure an amount argument was provided
			if (!args || !args[0]) {
				return chatClient.say(channel, `Please provide an amount to gamble. Usage: ${gamble.usage}`);
			}

			// Extract the amount from the command arguments
			let amount: number;

			if (args[0] === 'all') {
				// Gamble all balance
				amount = Math.max(0, acct?.balance ?? 0); // Ensure amount is positive
			} else if (args[0].endsWith('%')) {
				// Gamble a percentage of the balance
				const percentage = parseInt(args[0].slice(0, -1));
				if (isNaN(percentage) || percentage < 0 || percentage > 100) {
					return chatClient.say(channel, `Please provide a valid percentage for gambling. Usage: ${gamble.usage}`);
				}
				amount = Math.floor((acct?.balance ?? 0) * (percentage / 100));
			} else {
				// Gamble a specific amount
				amount = parseInt(args[0]);
				if (isNaN(amount) || amount <= 0) {
					return chatClient.say(channel, `Please provide a valid amount greater than 0 for gambling. Usage: ${gamble.usage}`);
				}
			}

			// Attempt to debit the wager from the user's wallet first
			const debited = await balanceAdapter.debitWallet(userKey, amount, msg.userInfo.userName, msg.channelId);
			if (!debited) return chatClient.say(channel, 'You do not have enough coins to gamble.');

			// Perform the gambling logic
			const isWin = randomInt(1, 11) <= 3; // 30% chance of winning
			if (isWin) {
				const winnings = amount * 2; // net profit equals winnings - stake; we'll credit the winnings
				await balanceAdapter.creditWallet(userKey, winnings, msg.userInfo.userName, msg.channelId);
				await chatClient.say(channel, `Congratulations ${user}! You won ${winnings} coins.`);
			} else {
				await chatClient.say(channel, `${user}, better luck next time! You lost ${amount} coins.`);
				// losing path: stake was already debited, nothing more to do
			}
		} catch (error) {
			logger.error('Error saving user information:', error);
			await chatClient.say(channel, 'An error occurred while updating user information.');
		}
	},
};

export default gamble;