import { Command } from '../../interfaces/Command';
import { ChatMessage } from '@twurple/chat/lib';
import { UserModel } from '../../database/models/userModel';
import { getChatClient } from '../../chat';
import { getUserApi } from '../../api/userApiClient';

const watchTime: Command = {
	name: 'watchtime',
	description: 'Displays the user\'s watch time',
	usage: '!watchtime',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();

		try {
			const userRecord = await UserModel.findOne({ username: msg.userInfo.userName });

			if (userRecord && userRecord.watchTime !== undefined) {
				const totalSeconds = userRecord.watchTime / 1000;
				const days = Math.floor(totalSeconds / 86400);
				const hours = Math.floor((totalSeconds % 86400) / 3600);
				const minutes = Math.floor((totalSeconds % 3600) / 60);
				const seconds = Math.floor(totalSeconds % 60);

				await chatClient.say(channel, `@${msg.userInfo.displayName} has been watching the stream for ${days} days, ${hours} hours, ${minutes} minutes, and ${seconds} seconds.`);
			} else {
				await chatClient.say(channel, `@${msg.userInfo.displayName} has no recorded watch time.`);
			}
		} catch (error) {
			console.error('Error fetching watch time:', error);
			await chatClient.say(channel, 'An error occurred while fetching watch time.');
		}
	},
};

export default watchTime;