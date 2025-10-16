import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import logger from '../../util/logger';

const eightball: Command = {
	name: '8ball',
	description: 'ask a yes or no question',
	usage: '!8ball <question>',
	/**
	 * Executes the 8ball command.
	 *
	 * @param channel The channel that the command was triggered in.
	 * @param user The user that triggered the command.
	 * @param args The arguments that were passed to the command.
	 * @param text The full text of the message that triggered the command.
	 * @param msg The message instance that triggered the command.
	 *
	 * @returns {Promise<void>} The result of the command execution.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		logger.debug('hit 8ball');
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		// Check if the user provided a question
		if (args.length < 1) return chatClient.say(channel, 'Please ask a yes or no question.');

		// Simulate a random answer from the magic 8-ball
		const answers = [
			'It is certain.',
			'It is decidedly so.',
			'Without a doubt.',
			'Yes ... definitely.',
			'You may rely on it.',
			'As I see it, yes.',
			'Most likely.',
			'Outlook good.',
			'Yes.',
			'Signs point to yes.',
			'Reply hazy, try again.',
			'Ask again later.',
			'Better not tell you now.',
			'Cannot predict now.',
			'Concentrate and ask again.',
			'Don\'t count on it.',
			'My reply is no.',
			'My sources say no.',
			'Outlook not so good.',
			'Very doubtful.',
		];
		const randomIndex = Math.floor(Math.random() * answers.length);
		const answer = answers[randomIndex];

		// Send the answer to the chat
		await chatClient.say(channel, `🎱 ${answer}`);
	},
};
export default eightball;