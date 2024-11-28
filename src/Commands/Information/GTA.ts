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
		const streamerChannel = await userApiClient.channels.getChannelInfoById(broadcasterID.id as UserIdResolvable);

		if (streamerChannel?.gameName !== 'Grand Theft Auto V') return chatClient.say(channel, 'You must be in GTA V to use this command.');
		// console.log('GTA command executed.', streamerChannel);

		try {
			switch (channel) {
				case 'skullgaminghq':
					await chatClient.say(channel, 'Jimmy Jackson (32) grew up in Newfoundland, Canada. After losing his mother and witnessing his father’s death by police, Jimmy turned to crime and street racing. Hunted by police, he fled to Los Santos to start fresh and dominate the racing scene.');
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