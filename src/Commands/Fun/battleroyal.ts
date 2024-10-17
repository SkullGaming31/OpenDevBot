import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import axios from 'axios';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { TokenModel } from '../../database/models/tokenModel';
import { Command } from '../../interfaces/Command';
import { broadcasterInfo } from '../../util/constants';

axios.defaults;

const battleroyale: Command = {
	name: '',
	description: '',
	usage: '',
	moderator: false,
	devOnly: true,
	cooldown: 30000,
	/**
	 * @description Executes the battleroyale command.
	 *
	 * @param {string} channel The channel that the command was triggered in.
	 * @param {string} user The user that triggered the command.
	 * @param {string[]} args The arguments that were passed to the command.
	 * @param {string} text The full text of the message that triggered the command.
	 * @param {ChatMessage} msg The message instance that triggered the command.
	 *
	 * @returns {Promise<void>} The result of the command execution.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();

		const broadcasterID = await userApiClient.channels.getChannelInfoById(broadcasterInfo[0].id);
		if (!broadcasterID?.id) return;


		const moderatorsResponse = await userApiClient.moderation.getModerators(broadcasterID?.id as UserIdResolvable);
		const moderatorsData = moderatorsResponse.data; // Access the moderator data

		const isModerator = moderatorsData.some(moderator => moderator.userId === msg.userInfo.userId);
		const isBroadcaster = broadcasterID.id === msg.userInfo.userId;
		const isStaff = isModerator || isBroadcaster;

		try {
			chatClient.say(channel, 'This command is a WIP');
		} catch (error) {
			console.error(error);
		}
	},
};

export default battleroyale;