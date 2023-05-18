import { PrivateMessage } from '@twurple/chat/lib';
import { randomInt } from 'crypto';
import { getChatClient } from '../../chat';
import { UserModel } from '../../database/models/userModel';
import { Command } from '../../interfaces/apiInterfaces';

const beg: Command = {
	name: 'beg',
	description: 'Beg to get some free coins(12 hour cooldown)',
	usage: '!beg',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		const username = user.toLowerCase();
		const userDoc = await UserModel.findOne({ username });
		const currentTime = new Date();
		const lastBegTime = userDoc?.lastBegTime || new Date(0);
		const timeSinceLastBeg = Math.floor((currentTime.getTime() - lastBegTime.getTime()) / 1000);
		const begCooldownSeconds = 12 * 60 * 60; // 12 hours in seconds

		if (timeSinceLastBeg < begCooldownSeconds) {
			const remainingCooldown = begCooldownSeconds - timeSinceLastBeg;
			const remainingHours = Math.floor(remainingCooldown / 3600);
			const remainingMinutes = Math.floor((remainingCooldown % 3600) / 60);
			const remainingSeconds = remainingCooldown % 60;
			return chatClient.say(channel, `@${user}, you must wait ${remainingHours}h ${remainingMinutes}m ${remainingSeconds}s before begging again.`);
		}

		const amount = randomInt(1, 101);

		await UserModel.updateOne(
			{ username },
			{ $inc: { balance: amount }, $set: { lastBegTime: currentTime } }
		);

		chatClient.say(channel, `@${user}, you begged and received ${amount} Gold!`);
	}
};

export default beg;