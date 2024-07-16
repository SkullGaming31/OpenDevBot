import { ChatMessage } from '@twurple/chat/lib';
import { randomInt } from 'crypto';
import { getChatClient } from '../../chat';
import { UserModel } from '../../database/models/userModel';
import { Command } from '../../interfaces/Command';
import { getUserApi } from '../../api/userApiClient';
import { broadcasterInfo } from '../../util/constants';
import { UserIdResolvable } from '@twurple/api';

const beg: Command = {
	name: 'beg',
	description: 'Beg to get some free coins(12 hour cooldown)',
	usage: '!beg',
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
		const stream = await userApiClient.streams.getStreamByUserId(broadcasterInfo[0].id as UserIdResolvable);

		if (stream === null) return;

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
			await UserModel.updateOne({ username, channelId }, { $inc: { balance: amount }, $set: { lastBegTime: new Date() } });
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