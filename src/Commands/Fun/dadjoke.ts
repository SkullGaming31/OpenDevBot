import { ChatMessage } from '@twurple/chat/lib';
import axios from 'axios';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import logger from '../../util/logger';

interface IDadJoke {
	id: string;
	joke: string;
	status: number;
}

const dadjoke: Command = {
	name: 'dadjoke',
	description: 'Gives a random dadjoke from icanhazdadjoke.com',
	usage: '!dadjoke',
	/**
	 * Retrieves a random dadjoke from icanhazdadjoke.com and sends it to the channel.
	 * @param {string} channel The channel to send the message to
	 * @param {string} user The user who sent the command
	 * @param {string[]} args The arguments given to the command
	 * @param {string} text The full text of the message that was sent
	 * @param {ChatMessage} msg The full message object that was sent
	 */
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
			logger.error(error);
		}
	}
};
export default dadjoke;