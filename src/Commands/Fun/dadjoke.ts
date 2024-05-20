import { ChatMessage } from '@twurple/chat/lib';
import axios from 'axios';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { IDadJoke } from '../../interfaces/IDadJoke';

const dadjoke: Command = {
	name: 'dadjoke',
	description: 'Gives a random dadjoke from icanhazdadjoke.com',
	usage: '!dadjoke',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const response = await axios.get<IDadJoke>('https://icanhazdadjoke.com/', {
			headers: {
				'Accept': 'application/json',
				'User-Agent': 'Personal Twitch ChatBot (https://github.com/skullgaming31/openDevBot)'
			}
		});
		try {
			if (response.data.status === 200) {
				await chatClient.say(channel, `${response.data.joke}`);
			} else {
				await chatClient.say(channel, 'An error occured while trying to send the dadjoke');
			}
		} catch (error) {
			console.error(error);
		}
	}
};
export default dadjoke;