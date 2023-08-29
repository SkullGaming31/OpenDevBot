import { ChatMessage } from '@twurple/chat/lib';
import axios from 'axios';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { sleep } from '../../util/util';

const chatgpt: Command = {
	name: 'chatgpt',
	description: 'Ask ChatGPT a Question!',
	usage: '!test <question>',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();

		const response = await axios.post('https://api.openai.com/v1/chat/completions', {
			model: 'gpt-3.5-turbo',
			messages: [{ role: 'user', content: args.join(' ') }],
			temperature: 0.7
		}, {
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${process.env.OPENAI_KEY}`
			}
		});
		let message = response.data.choices[0].message.content;
		while (message.length > 0) {
			const chunk = message.substring(0, 500);
			message = message.substring(500);

			console.log(chunk);
			await chatClient.say(channel, chunk);

			if (message.length > 0) {
				await sleep(2000); // Wait for 2 seconds before sending the next chunk
			}
		}
	}
};
export default chatgpt;