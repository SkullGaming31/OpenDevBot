import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';

const eightball: Command = {
	name: '8ball',
	description: 'ask a yes or no question',
	usage: '!8ball <question>',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		console.log('hit 8ball');
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