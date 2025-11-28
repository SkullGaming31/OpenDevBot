import { ChatMessage } from '@twurple/chat/lib';
import { randomInt } from 'crypto';
import { getChatClient } from '../../chat';
import balanceAdapter from '../../services/balanceAdapter';
import { Command } from '../../interfaces/Command';
import { getUserApi } from '../../api/userApiClient';
import { broadcasterInfo } from '../../util/constants';
import type { UserIdResolvable } from '@twurple/api';
import { UserModel } from '../../database/models/userModel';

const beg: Command = {
	name: 'beg',
	description: 'Beg to get some free coins(12 hour cooldown)',
	usage: '!beg',
	/**
	 * Execute the !beg command. This command allows users to beg for free coins every 12 hours.
	 * The command will check if the user has already begged in the last 12 hours and if the stream is currently live.
	 * If the user has not begged in the last 12 hours and the stream is live, the command will randomly decide
	 * if the user is successful in their beg. If the user is successful, they will receive a random amount of coins
	 * between 1 and 100. If the user is not successful, they will receive a random response from a list of failed responses.
	 * If the user has already begged in the last 12 hours, the command will respond with a cooldown message.
	 * @param channel - The channel where the command was triggered
	 * @param user - The user who triggered the command
	 * @param args - The arguments passed to the command
	 * @param text - The text that the user typed in to trigger the command
	 * @param msg - The message object from TwitchIO
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const username = user.toLowerCase();
		const userDoc = await UserModel.findOne({ username });
		const channelId = msg.channelId;
		const currentTime = new Date();
		const lastBegTime = userDoc?.lastBegTime || new Date(0);
		const timeSinceLastBeg = Math.floor((currentTime.getTime() - lastBegTime.getTime()) / 1000);
		const begCooldownSeconds = 12 * 60 * 60; // 12 hours in seconds
		// Note: previously this command required the stream to be live. Remove that requirement
		// so users can beg while stream is offline. If you want to restore the old behavior,
		// check an env flag like BEG_REQUIRE_LIVE and skip when set.

		if (timeSinceLastBeg < begCooldownSeconds) {
			const remainingCooldown = begCooldownSeconds - timeSinceLastBeg;
			const remainingHours = Math.floor(remainingCooldown / 3600);
			const remainingMinutes = Math.floor((remainingCooldown % 3600) / 60);
			const remainingSeconds = remainingCooldown % 60;
			return chatClient.say(channel, `@${user}, you must wait ${remainingHours}h ${remainingMinutes}m ${remainingSeconds}s before begging again.`);
		}

		const successChance = 0.30; // Adjust as needed
		if (randomInt(1, 101) <= successChance * 100) {
			// Successful beg
			const amount = randomInt(1, 101);
			// Put winnings into the wallet (legacy UserModel.balance) via adapter
			const userKey = typeof msg.userInfo?.userId === 'string' ? msg.userInfo.userId : undefined;
			const usernameArg = (typeof msg.userInfo?.userName === 'string' ? msg.userInfo.userName : undefined) as string | undefined;
			await balanceAdapter.creditWallet(userKey ?? usernameArg, amount, usernameArg, channelId);
			// update lastBegTime on the UserModel (best-effort)
			const { UserModel } = await import('../../database/models/userModel');
			if (msg.userInfo?.userId) {
				await UserModel.updateOne({ id: msg.userInfo.userId }, { $set: { lastBegTime: new Date(), username } }, { upsert: true });
			} else {
				await UserModel.updateOne({ username, channelId }, { $set: { lastBegTime: new Date() } }, { upsert: true });
			}
			const successResponses = [
				`@${user}, your pitiful pleas tug at my heartstrings. Here's ${amount} Gold!`,
				`@${user}, seems like you're down on your luck. Here's ${amount} Gold to get by.`,
				`@${user}, not bad for a beggar! Here's ${amount} Gold.`,
				`@${user}, your persistence is admirable. Here's ${amount} Gold.`,
				`@${user}, even beggars deserve some luck. Here's ${amount} Gold!`,
				`@${user}, your begging skills are improving! Here's ${amount} Gold to keep practicing.`,
				`@${user}, I'm feeling generous today. Consider this ${amount} Gold an investment in your future endeavors (not begging).`,
				`@${user}, maybe consider putting these begging skills to work somewhere else. But for now, here's ${amount} Gold.`,
				`@${user}, alright, alright, you win. Here's ${amount} Gold, but don't make a habit of it!`
			];

			const randomSuccessResponse = successResponses[randomInt(0, successResponses.length)];
			await chatClient.say(channel, randomSuccessResponse);
		} else {
			// Failed beg
			const failedResponses = [
				`@${user}, I'm not feeling generous today. Try begging again later.`,
				`@${user}, it seems your begging skills need some work. Perhaps practice in the mirror?`,
				`@${user}, maybe consider getting a job instead of begging? Just a thought.`,
				`@${user}, I'm not made of money! Try your luck elsewhere.`,
				`@${user}, begging is a tough profession.Perhaps consider a different career path ?`,
				`@${user}, your begging skills need some work.Maybe practice in the mirror before trying again ?`,
				`@${user}, seems like you've used up all your good begging luck today. Try again later!`,
				`@${user}, I appreciate the effort, but I'm going to have to say no this time. Maybe try offering a service instead of begging?`
			];
			const randomFailedResponse = failedResponses[randomInt(0, failedResponses.length)];
			await chatClient.say(channel, randomFailedResponse);
		}
	}
};

export default beg;