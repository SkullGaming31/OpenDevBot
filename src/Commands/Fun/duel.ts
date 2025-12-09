import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import balanceAdapter from '../../services/balanceAdapter';
import { Command } from '../../interfaces/Command';
import { sleep } from '../../util/util';

// In-memory map for pending duel challenges: challengedUser -> { challenger, amount, accepted }
const pendingDuels: Map<string, { challenger: string; amount: number; accepted: boolean }> = new Map();

export function acceptDuel(username: string) {
	const key = username.toLowerCase();
	const entry = pendingDuels.get(key);
	if (!entry) return false;
	entry.accepted = true;
	pendingDuels.set(key, entry);
	return true;
}

export function declineDuel(username: string) {
	const key = username.toLowerCase();
	return pendingDuels.delete(key);
}

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
		void text;
		const chatClient = await getChatClient();

		const username = user.toLowerCase();
		void username;
		const channelId = msg.channelId;

		// Parse the challenged user and the duel amount from the arguments
		const challengedUser = args[0];
		if (challengedUser.includes('@')) challengedUser.replace('@', '');
		const duelAmount = parseInt(args[1]);

		// Check if the duel amount is valid
		if (!duelAmount || duelAmount <= 0) return chatClient.say(channel, 'Invalid duel amount.');

		// Check if the challenged user exists
		const challengedUserDoc = await balanceAdapter.getOrCreate(challengedUser.toLowerCase());
		if (!challengedUserDoc) return chatClient.say(channel, 'User not found.');

		// Disallow dueling yourself
		const challengerId = msg.userInfo.userId ?? msg.userInfo.userName;
		const challengedId = challengedUserDoc.userId ?? challengedUser.toLowerCase();
		if (String(challengedId) === String(challengerId)) return chatClient.say(channel, 'You cannot duel yourself.');

		// Check challenger has enough in wallet (legacy) or bank via adapter debitWallet
		const hasFunds = await balanceAdapter.debitWallet(challengerId, duelAmount, msg.userInfo.userName, channelId);
		if (!hasFunds) return chatClient.say(channel, 'You don\'t have enough balance to start the duel.');

		// Ask the challenged user if they accept the duel and register a pending duel
		pendingDuels.set(challengedUser.toLowerCase(), { challenger: challengerId, amount: duelAmount, accepted: false });
		await chatClient.say(channel, `${challengedUser}, you have been challenged to a duel for ${duelAmount} gold by ${msg.userInfo.displayName}. Type "!accept" to accept the duel or "!decline" to decline it.`);

		// Wait for 1 minute for the challenged user to accept the duel
		await sleep(60 * 1000);

		// Check if the challenged user has accepted the duel
		const pending = pendingDuels.get(challengedUser.toLowerCase());
		if (!pending || !pending.accepted) {
			pendingDuels.delete(challengedUser.toLowerCase());
			return chatClient.say(channel, `${challengedUser} has declined the duel.`);
		}
		// remove pending entry
		pendingDuels.delete(challengedUser.toLowerCase());

		// Choose a random winner and transfer amount atomically via adapter.transfer
		const winnerIndex = Math.floor(Math.random() * 2);
		const winner = winnerIndex === 0 ? (msg.userInfo.userId ?? msg.userInfo.userName) : (challengedUserDoc.userId ?? challengedUserDoc.userId ?? challengedUser.toLowerCase());
		const loser = winnerIndex === 0 ? (challengedUserDoc.userId ?? challengedUser.toLowerCase()) : (msg.userInfo.userId ?? msg.userInfo.userName);

		// Use adapter.transfer which uses economyService.transaction when available and falls back to atomic ops
		await balanceAdapter.transfer(loser, winner, duelAmount);

		// Announce the winner in the chat
		await chatClient.say(channel, `${msg.userInfo.displayName} has won the duel against ${challengedUser} and won ${duelAmount} gold!`);

		// Reset the challenged user's duel challenge accepted flag (best-effort mirror)
		try {
			await balanceAdapter.getOrCreate(challengedUserDoc.userId ?? challengedUserDoc.userId ?? challengedUser.toLowerCase());
		} catch (err) {
			// ignore
		}
	}
};

export default duel;