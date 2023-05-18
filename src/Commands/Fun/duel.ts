import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import UserModel from '../../database/models/userModel';
import { Command } from '../../interfaces/apiInterfaces';
import { sleep } from '../../util/util';

const duel: Command = {
	name: 'duel',
	description: 'Challenge another user to a duel for x amount of skulls',
	usage: '!duel [user] [amount]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		const username = user.toLowerCase();

		// Parse the challenged user and the duel amount from the arguments
		const challengedUser = args[0];
		if (challengedUser.includes('@')) challengedUser.replace('@', '');
		const duelAmount = parseInt(args[1]);

		// Check if the duel amount is valid
		if (!duelAmount || duelAmount <= 0) return chatClient.say(channel, 'Invalid duel amount.');

		// Check if the challenged user exists
		const challengedUserDoc = await UserModel.findOne({ username: challengedUser.toLowerCase() });
		if (!challengedUserDoc) return chatClient.say(channel, 'User not found.');

		// Check if the challenged user is the same as the challenger
		if (challengedUserDoc.id === msg.userInfo.userId) return chatClient.say(channel, 'You cannot duel yourself.');

		// Check if the challenger has enough balance
		const challengerDoc = await UserModel.findOne({ username });
		if (challengerDoc?.balance === undefined) return;
		if (!challengerDoc || challengerDoc.balance < duelAmount) return chatClient.say(channel, 'You don\'t have enough balance to start the duel.');

		// Ask the challenged user if they accept the duel
		await chatClient.say(channel, `${challengedUser}, you have been challenged to a duel for ${duelAmount} gold by ${msg.userInfo.displayName}. Type "!accept" to accept the duel or "!decline" to decline it.`);

		// Wait for 1 minute for the challenged user to accept the duel
		await sleep(60 * 1000);

		// Check if the challenged user has accepted the duel
		if (!challengedUserDoc.duelChallengeAccepted) {
			return chatClient.say(channel, `${challengedUser} has declined the duel.`);
		}

		// Deduct the duel amount from the challenger's balance
		await UserModel.updateOne({ username }, { $inc: { balance: -duelAmount } });

		// Choose a random winner
		const winnerIndex = Math.floor(Math.random() * 2);
		const winner = winnerIndex === 0 ? msg.userInfo.userName : challengedUserDoc.id;
		const loser = winnerIndex === 0 ? challengedUserDoc.id : msg.userInfo.userId;

		// Award the prize to the winner
		await UserModel.updateOne({ username: winner }, { $inc: { balance: duelAmount } });

		// Announce the winner in the chat
		await chatClient.say(channel, `${msg.userInfo.displayName} has won the duel against ${challengedUser} and won ${duelAmount} gold!`);

		// Reset the challenged user's duel challenge accepted flag
		await UserModel.updateOne({ username: challengedUserDoc.username }, { $set: { duelChallengeAccepted: false } });
	}
};

export default duel;