// import { Command } from '../../interfaces/Command';
// import { ChatMessage } from '@twurple/chat/lib';
// import { UserModel } from '../../database/models/userModel';
// import { getChatClient } from '../../chat';

// const watchTime: Command = {
// 	name: 'watchtime',
// 	description: 'Displays the user\'s watch time',
// 	usage: '!watchtime',
// 	/**
// 	 * Execute the watchtime command to fetch and display the user's watch time.
// 	 * 
// 	 * @param channel - The channel where the command was issued.
// 	 * @param user - The user who issued the command.
// 	 * @param args - The command arguments, which is empty for this command.
// 	 * @param text - The full text of the chat message.
// 	 * @param msg - The chat message object containing metadata and user information.
// 	 * 
// 	 * The function retrieves the user's watch time from the database and sends a message to the 
// 	 * chat with the watch time information. If the user has no recorded watch time, it sends a 
// 	 * message indicating that. If an error occurs while fetching the watch time, it sends a 
// 	 * message indicating that an error occurred.
// 	 */
// 	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
// 		const chatClient = await getChatClient();

// 		try {
// 			const userRecord = await UserModel.findOne({ id: msg.userInfo.userId });
// 			logger.debug('User Watchtime Record: ', userRecord);

// 			if (userRecord && userRecord.watchTime !== undefined) {
// 				const totalSeconds = userRecord.watchTime / 1000;
// 				const days = Math.floor(totalSeconds / 86400);
// 				const hours = Math.floor((totalSeconds % 86400) / 3600);
// 				const minutes = Math.floor((totalSeconds % 3600) / 60);
// 				const seconds = Math.floor(totalSeconds % 60);

// 				await chatClient.say(channel, `@${msg.userInfo.displayName} has been watching the stream for ${days} days, ${hours} hours, ${minutes} minutes, and ${seconds} seconds.`);
// 			} else {
// 				await chatClient.say(channel, `@${msg.userInfo.displayName} has no recorded watch time.`);
// 			}
// 		} catch (error) {
// 			logger.error('Error fetching watch time:', error);
// 			await chatClient.say(channel, 'An error occurred while fetching watch time.');
// 		}
// 	},
// };

// export default watchTime;
import { Command } from '../../interfaces/Command';
import { ChatMessage } from '@twurple/chat/lib';
import { UserModel } from '../../database/models/userModel';
import { getChatClient } from '../../chat';
import logger from '../../util/logger';

/**
 * Calculate the watch time in days, hours, minutes, and seconds based on the total seconds.
 */
function calculateWatchTime(watchTimeInSeconds: number): string {
	const days = Math.floor(watchTimeInSeconds / 86400);
	const hours = Math.floor((watchTimeInSeconds % 86400) / 3600);
	const minutes = Math.floor((watchTimeInSeconds % 3600) / 60);
	const seconds = Math.floor(watchTimeInSeconds % 60);

	return `${days} days, ${hours} hours, ${minutes} minutes, and ${seconds} seconds`;
}

const watchTime: Command = {
	name: 'watchtime',
	description: 'Displays the user\'s watch time',
	usage: '!watchtime',
	/**
	 * Executes the watchtime command.
	 *
	 * @param {string} channel - The channel that the command was triggered in.
	 * @param {string} user - The user that triggered the command.
	 * @param {string[]} args - The arguments that were passed to the command.
	 * @param {string} text - The full text of the message that triggered the command.
	 * @param {ChatMessage} msg - The message instance that triggered the command.
	 *
	 * @returns {Promise<void>} The result of the command execution.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		void user; void args; void text;
		const chatClient = await getChatClient();

		try {
			const userRecord = await UserModel.findOne({ id: msg.userInfo.userId });
			if (userRecord && userRecord.watchTime !== undefined) {
				const watchTimeMessage = `@${msg.userInfo.displayName} has been watching the stream for ${calculateWatchTime(userRecord.watchTime / 1000)}.`;
				await chatClient.say(channel, watchTimeMessage);
			} else {
				await chatClient.say(channel, `@${msg.userInfo.displayName} has no recorded watch time.`);
			}
		} catch (error) {
			if (error instanceof Error) {
				logger.error(`Error fetching watch time: ${error.message}`);
				await chatClient.say(channel, `An error occurred while fetching watch time: ${error.message}`);
			} else {
				logger.error('Unknown error fetching watch time');
				await chatClient.say(channel, 'An unknown error occurred while fetching watch time');
			}
		}
	},
};

export default watchTime;