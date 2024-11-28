import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import axios from 'axios';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { TokenModel } from '../../database/models/tokenModel';
import { Command } from '../../interfaces/Command';
import { broadcasterInfo } from '../../util/constants';

axios.defaults;

const gta: Command = {
	name: 'gta',
	description: 'Displays GTAcharacter\'s backstory',
	usage: '!gta',
	moderator: true,
	devOnly: true,
	cooldown: 30000,
	/**
	 * Executes the gta command.
	 *
	 * @param channel The channel that the command was triggered in.
	 * @param user The user that triggered the command.
	 * @param args The arguments that were passed to the command.
	 * @param text The full text of the message that triggered the command.
	 * @param msg The message instance that triggered the command.
	 *
	 * @returns {Promise<void>} The result of the command execution.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage): Promise<void> => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();

		const broadcasterID = await userApiClient.channels.getChannelInfoById(broadcasterInfo[0].id);
		if (!broadcasterID?.id) return;

		const moderatorsResponse = await userApiClient.moderation.getModerators(broadcasterID?.id as UserIdResolvable);
		const moderatorsData = moderatorsResponse.data; // Access the moderator data
		const stream = await userApiClient.streams.getStreamByUserId(broadcasterID.id as UserIdResolvable);

		if (stream?.gameId !== '32982') return chatClient.say(channel, 'You must be in GTA V to use this command.');

		try {
			switch (channel) {
				case 'skullgaminghq':
					await chatClient.say(channel, `Jimmy Jackson (32) grew up in a low populated town , in Newfoundland , Canada. His Mother (Carmella) and Father (Richard) were both Hard working loving parents. Unfortunately,
																				Carmella died not long after having Jimmy leaving Richard with a child to care for,  a lot of Overtime and bills stacking on the kitchen table. He just couldn’t keep up.
																				With eviction notices on the door every month, Richard needed to raise his son by any means possible. Small petty crimes started taking place which later lead into mugging the elderly and selling drugs. 
																				One day Richard left Jimmy with a babysitter to head to a meeting with one of his “friends”. As he opened the front door , police swarmed Richard and chaos pursued on the front lawn. After a long struggle,
																				Richard was shot and killed.. with Jimmy watching through the window.
																				From that moment on, Jimmy hated police and refused to stop for anyone or listen to any rules. Red lights didn’t matter and speed limits weren’t a part of his life anymore. That reckless driving turned into
																				good driving… that turned into Great driving. Jimmy later got into street racing and won national underground championships, with that police got his name and would follow him everywhere he went. 
																				So Jimmy fled the country and got a 1 way ticket to Los Santos to give the racing scene a run for its money. But first… he needs money. 
																				Los Santos, here I come.`);
					break;
				case 'modvlog':
					await chatClient.say(channel, 'Eugene Dixon(61) War vet, backstory coming soon...');
					break;
				default:
					await chatClient.say(channel, 'this channel is not in the database');
					break;
			}
			//
		} catch (error) {
			console.error(error);
		}
	},
};
export default gta;