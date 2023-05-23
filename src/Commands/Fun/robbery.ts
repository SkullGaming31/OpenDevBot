import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';


/**
 * Rob a house: house would have a list of items that could be stolen in it, tv/console systems, computers, laptops, cash etc
 * 
 * rob a person: would be a person in the chat- watch, juliery, cash etc
 * 
 * rob a store: cash in cash register, food/drinks, personal belongings etc
 */

const robber: Command = {
	name: 'robber',
	description: 'Rob a house, person, or store for quick cash',
	usage: '!robber <house|person|store>',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		chatClient.say(channel, 'This command is brand new and the functionality of it is still under construction.');
	}
};
export default robber;