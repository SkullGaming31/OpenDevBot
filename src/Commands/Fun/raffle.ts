import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import UserModel from '../../database/models/userModel';
import { Command } from '../../interfaces/apiInterfaces';
import { sleep } from '../../util/util';

const raffle: Command = {// raffle not working
	name: 'raffle',
	description: 'Start a raffle with x amount of gold',
	usage: '!raffle [amount]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		const isMod = msg.userInfo.isMod || msg.userInfo.isBroadcaster;
		let raffleInProgress = false;

		// Initialize the participants array
		let participants: string[] = [];
		console.log(participants);

		// Parse the raffle amount from the arguments
		const raffleAmount = parseInt(args[0]);

		// Check if the raffle amount is valid
		if (!raffleAmount || raffleAmount <= 0) return chatClient.say(channel, `Invalid raffle amount, Usage: ${raffle.usage}`);

		// Check if a raffle is already in progress
		if (raffleInProgress) return chatClient.say(channel, 'A raffle is already in progress. Please wait for it to finish.');

		// Check if the person starting the raffle is a mod
		if (!isMod) {
			// If the person is not a mod, check if they have enough balance
			const userDoc = await UserModel.findOne({ id: msg.userInfo.userId });
			if (!userDoc || userDoc.balance < raffleAmount) {
				return chatClient.say(channel, 'You don\'t have enough balance to start the raffle.');	
			}
			// Deduct the raffle amount from the user's balance
			await UserModel.updateOne({ id: msg.userInfo.userId }, { $inc: { balance: -raffleAmount } });
		}

		// Set the raffle in progress flag
		raffleInProgress = true;

		// Send a message to the chat asking for participants
		await chatClient.say(channel, `A raffle for ${raffleAmount} gold is starting! Type "!join" to participate.`);

		// Listen for messages to add participants
		chatClient.onMessage(async (channel: string, user: string, text: string, msg: PrivateMessage) => {
			if (text === '!join' && !participants.includes(user)) {
				participants.push(user);
				await chatClient.say(channel, `@${user} has joined the raffle!`);
				console.log(participants);
			}
		});

		// Wait for 1 minute
		await sleep(60 * 1000);

		// Choose a random winner from the participants
		const winnerIndex = Math.floor(Math.random() * participants.length);
		const winner = participants[winnerIndex];

		// Award the prize to the winner
		await UserModel.updateOne({ id: winner }, { $inc: { balance: raffleAmount } });

		// Reset the raffle in progress flag and the participants array
		raffleInProgress = false;
		participants = [];

		// Announce the winner in the chat
		if (winner !== undefined) await chatClient.say(channel, `Congratulations, ${winner}! You have won the raffle of ${raffleAmount} gold!`);
		console.log(winner);
	}
};

// Announce the winner in the chat
// if (winner !== undefined) await chatClient.say(channel, `Congratulations, ${winner}! You have won the raffle of ${raffleAmount} gold!`);
// console.log(winner);

export default raffle;
