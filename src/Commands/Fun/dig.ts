import { PrivateMessage } from '@twurple/chat/lib';
import { randomInt } from 'node:crypto';
import { getChatClient } from '../../chat';
import UserModel, { User } from '../../database/models/userModel';
import { Command } from '../../interfaces/apiInterfaces';

const dig: Command = {
	name: 'dig',
	description: 'Dig up a hole and potentially win gold',
	usage: '!dig [amount]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		const username = user.toLowerCase();

		// Parse the dig amount from the arguments
		const digAmount = parseInt(args[0]);

		// Check if the dig amount is valid
		if (!digAmount || digAmount <= 0) return chatClient.say(channel, `Invalid bet amount, Usage: ${dig.usage}`);

		//check if the user is not the broadcaster
		if (!msg.userInfo.isBroadcaster) {
		// Check if the user has enough balance
			const userDoc = await UserModel.findOne<User>({ username });
			if (userDoc?.balance === undefined) return;
			if (!userDoc || userDoc.balance < digAmount) { return chatClient.say(channel, 'You don\'t have enough balance to dig.'); }
		}

		// Deduct the dig amount from the user's balance
		await UserModel.updateOne({ username, balance: { $gte: digAmount } }, { $inc: { balance: -digAmount } });

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
			await UserModel.updateOne({ username }, { $inc: { balance: -digAmount } });
			return chatClient.say(channel, `You dug up a bomb and lost ${digAmount} gold. Better luck next time!`);
		}

		// If the user didn't dig up a bomb, award them with a prize
		const prizeAmount = Math.floor(Math.random() * (digAmount * 2)) + digAmount;
		await UserModel.updateOne({ username }, { $inc: { balance: prizeAmount } });
		return chatClient.say(channel, `You dug up the cache and won ${prizeAmount} gold!`);
	}
};

export default dig;