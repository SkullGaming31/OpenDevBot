import { ChatMessage } from '@twurple/chat/lib';
import axios from 'axios';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { userID } from '../../util/constants';

axios.defaults;

const spaceengineers: Command = {
	name: 'spaceengineers',
	aliases: ['se'],
	description: 'Displays Pong in chat',
	usage: '!spaceengineers or !se',
	cooldown: 30000,
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();

		const broadcasterInfo = await userApiClient.channels.getChannelInfoById(userID);
		if (!broadcasterInfo?.id) return;

		await chatClient.say(channel, 'Space Engineers is a sandbox game about engineering, construction and maintenance of space works. Players build space ships and space stations of various sizes and utilization (civil and military), pilot ships and perform asteroid mining. Space Engineers utilizes a realistic volumetric - based physics engine: all objects can be assembled, disassembled, damaged and destroyed. or Advanced Rust in Space');
	}
};
export default spaceengineers;
