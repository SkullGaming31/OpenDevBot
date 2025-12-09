import { ChatMessage } from '@twurple/chat/lib';
import { randomInt } from 'node:crypto';
import { getChatClient } from '../../chat';
import { UserModel } from '../../database/models/userModel';
import { Command } from '../../interfaces/Command';

const dig: Command = {
	name: 'dig',
	description: 'Dig up a hole and potentially win gold',
	usage: '!dig [amount]',
	/**
	 * Executes the dig command to allow the user to dig up a hole and potentially win gold.
	 * Parses the dig amount from the arguments and checks if it is valid.
	 * Checks if the user has enough balance to dig and deducts the dig amount from the user's balance.
	 * Generates a random number of bombs and creates an array of holes with the specified number of bombs.
	 * Shuffles the holes randomly and checks if the user dug up a bomb.
	 * Updates the user's balance accordingly and sends a message to the chat with the result.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		void text;
		const chatClient = await getChatClient();

		const username = user.toLowerCase();
		const channelId = msg.channelId;

		// Parse the dig amount from the arguments
		const digAmount = parseInt(args[0]);

		// Check if the dig amount is valid
		if (!digAmount || digAmount <= 0) return chatClient.say(channel, `Invalid bet amount, Usage: ${dig.usage}`);
		// Use OR here to validate bounds
		if (digAmount < 100 || digAmount > 5000) return chatClient.say(channel, 'Minimum/maximum bet amount is 100-5000');

		// Use legacy wallet for betting: check UserModel balance
		const userDoc = msg.userInfo?.userId ? await UserModel.findOne({ id: msg.userInfo.userId }) : await UserModel.findOne({ username, channelId });
		const currentBalance = userDoc?.balance ?? 0;
		if (currentBalance < digAmount) return chatClient.say(channel, 'You don\'t have enough balance to dig.');

		// Generate a random number between 1-3 to decide how many bombs are in play
		const numBombs = randomInt(1, 4);

		// Generate an array of holes with the specified number of bombs
		const holes: string[] = [];
		for (let i = 0; i < 5; i++) {
			if (i < numBombs) {
				holes.push('bomb');
				continue;
			}
			holes.push('empty');
		}

		// Shuffle the holes randomly
		for (let i = holes.length - 1; i > 0; i--) {
			const j = randomInt(0, i + 1);
			[holes[i], holes[j]] = [holes[j], holes[i]];
		}


		// Check if the user dug up a bomb
		if (holes[0] === 'bomb') {
			// Atomically deduct from wallet only if sufficient funds (prevents pulling from bank)
			const userIdKey = typeof msg.userInfo?.userId === 'string' ? msg.userInfo.userId : undefined;
			const debited = await (await import('../../services/balanceAdapter')).debitWallet(userIdKey ?? username, digAmount, username, channelId);
			if (!debited) return chatClient.say(channel, `@${user}, you don't have enough wallet funds to place that bet.`);

			const badLuckMessages = [
				`You dug up a bomb and lost ${digAmount} gold. There were ${numBombs} bombs in play. Better luck next time!`,
				`Oops! You hit a bomb and lost ${digAmount} gold. Try again soon!`,
				`Seems like you triggered a buried treasure! Unfortunately, it was a bomb. Don't give up, ${username}!`,
				`Looks like today isn't your lucky day. You dug up a bomb and lost ${digAmount} gold. There were ${numBombs} bombs in play, Keep digging!`,
				`you avoid digging up the cache to follow a modvlog to a shed which he drops a grenade on you, you lost ${digAmount}`
			];

			const randomIndex = Math.floor(Math.random() * badLuckMessages.length);
			const randomMessage = badLuckMessages[randomIndex];

			return chatClient.say(channel, randomMessage);
		}

		// If the user didn't dig up a bomb, award them with a prize
		const prizeAmount = Math.floor(Math.random() * (digAmount * 2)) + digAmount;
		// Award prize to wallet (legacy) via adapter
		const userIdKey2 = typeof msg.userInfo?.userId === 'string' ? msg.userInfo.userId : undefined;
		await (await import('../../services/balanceAdapter')).creditWallet(userIdKey2 ?? username, prizeAmount, username, channelId);
		return chatClient.say(channel, `You dug up the cache and won ${prizeAmount} gold! You managed to avoid ${numBombs} bombs.`);
	}
};

export default dig;