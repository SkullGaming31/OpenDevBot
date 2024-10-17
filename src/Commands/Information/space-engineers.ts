import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';

const spaceEngineersDescription: string = 'Space Engineers is a sandbox game about engineering, construction and maintenance of space works. Players build space ships and space stations of various sizes and utilization (civil and military), pilot ships and perform asteroid mining. Space Engineers utilizes a realistic volumetric - based physics engine: all objects can be assembled, disassembled, damaged and destroyed or Advanced Rust in Space';

const spaceengineers: Command = {
	name: 'spaceengineers',
	aliases: ['se'],
	description: 'Description of what Space Engineers Is',
	usage: '!spaceengineers or !se',
	cooldown: 30000,
	/**
	 * @description
	 * Command to send a message about what Space Engineers is
	 * @param {string} channel - The channel the command was used in
	 * @param {string} user - The user who used the command
	 * @param {string[]} args - The arguments passed to the command
	 * @param {string} text - The full text of the message that was posted
	 * @param {ChatMessage} msg - The message object
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		if (channel !== 'skullgaminghq') return;

		await chatClient.say(channel, spaceEngineersDescription);
	}
};
export default spaceengineers;
