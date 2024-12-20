import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { UserModel } from '../../database/models/userModel';
import { Command } from '../../interfaces/Command';
import { sleep } from '../../util/util';

const duel: Command = {
	name: 'duel',
	description: 'Challenge another user to a duel for x amount of skulls',
	usage: '!duel [user] [amount]',
	/**
	 * Executes a duel command where a user can challenge another user to a duel for a specified amount of gold.
	 * 
	 * @param {string} channel The channel where the command was triggered.
	 * @param {string} user The user who initiated the duel.
	 * @param {string[]} args The arguments passed to the command (challenged user and duel amount).
	 * @param {string} text The full text of the message that triggered the command.
	 * @param {ChatMessage} msg The message instance that triggered the command.
	 * 
	 * @returns {Promise<void>} The result of the duel execution.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();

		const username = user.toLowerCase();
		const channelId = msg.channelId;

		// Parse the challenged user and the duel amount from the arguments
		const challengedUser = args[0];
		if (challengedUser.includes('@')) challengedUser.replace('@', '');
		const duelAmount = parseInt(args[1]);

		// Check if the duel amount is valid
		if (!duelAmount || duelAmount <= 0) return chatClient.say(channel, 'Invalid duel amount.');

		// Check if the challenged user exists
		const challengedUserDoc = await UserModel.findOne({ username: challengedUser.toLowerCase(), channelId });
		if (!challengedUserDoc) return chatClient.say(channel, 'User not found.');

		// Check if the challenged user is the same as the challenger
		if (challengedUserDoc.id === msg.userInfo.userId) return chatClient.say(channel, 'You cannot duel yourself.');

		// Check if the challenger has enough balance
		const challengerDoc = await UserModel.findOne({ username, channelId });
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
		await UserModel.updateOne({ username, channelId }, { $inc: { balance: -duelAmount } });

		// Choose a random winner
		const winnerIndex = Math.floor(Math.random() * 2);
		const winner = winnerIndex === 0 ? msg.userInfo.userName : challengedUserDoc.id;
		const loser = winnerIndex === 0 ? challengedUserDoc.id : msg.userInfo.userId;

		// Award the prize to the winner
		await UserModel.updateOne({ username: winner, channelId }, { $inc: { balance: duelAmount } });

		// Announce the winner in the chat
		await chatClient.say(channel, `${msg.userInfo.displayName} has won the duel against ${challengedUser} and won ${duelAmount} gold!`);

		// Reset the challenged user's duel challenge accepted flag
		await UserModel.updateOne({ username: challengedUserDoc.username, channelId }, { $set: { duelChallengeAccepted: false } });
	}
};

export default duel;