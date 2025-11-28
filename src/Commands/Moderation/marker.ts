import type { HelixChannelEditor, UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import axios from 'axios';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { CommandUssageWebhookTOKEN, commandUsageWebhookID, broadcasterInfo } from '../../util/constants';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import logger from '../../util/logger';

axios.defaults;

/**
 * Format the total seconds into hours, minutes, and remaining seconds.
 * 
 * @param seconds - The total number of seconds to be formatted.
 * @returns A string representing the formatted time in hours, minutes, and seconds.
 */
function formatStreamTime(seconds: number) {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const remainingSeconds = seconds % 60;

	return `${hours}h ${minutes}m ${remainingSeconds}s`;
}

const marker: Command = {
	name: 'marker',
	description: 'Creates a marker at the current location in the broadcaster\'s stream',
	usage: '!marker [description] (description is optional)',
	moderator: true,
	/**
	 * Creates a marker at the current location in the broadcaster's stream with an optional description.
	 * 
	 * @param channel - The channel the command was used in.
	 * @param user - The user who used the command.
	 * @param args - The array of arguments provided with the command.
	 * @param text - The entire message that was sent.
	 * @param msg - The ChatMessage object containing information about the message.
	 * 
	 * @throws {Error} If the broadcaster ID is not found, the user search fails, or the command is used when the stream is not live.
	 * @throws {Error} If the command is used by a user without the required permission of Channel Broadcaster or Editor.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });

		try {
			const broadcasterID = await userApiClient.channels.getChannelInfoById(broadcasterInfo[0].id as UserIdResolvable);
			if (!broadcasterID?.id) {
				throw new Error('Broadcaster ID not found');
			}

			const EditorResponse = await userApiClient.channels.getChannelEditors(broadcasterID.id as UserIdResolvable);
			const isEditor = EditorResponse.some((editor: HelixChannelEditor) => editor.userId === msg.userInfo.userId);
			const isStaff = msg.userInfo.isBroadcaster || isEditor;

			const stream = await userApiClient.streams.getStreamByUserId(broadcasterID.id as UserIdResolvable);
			if (!stream) {
				await chatClient.say(channel, 'The stream must be live to use this command');
				return;
			}

			const userSearch = await userApiClient.users.getUserByName(msg.userInfo.userName);
			if (!userSearch?.id) {
				throw new Error('User search failed');
			}

			const description = args.slice(1).join(' ').trim(); // Join all args starting from index 1 into a single description
			const sanitizedDescription = description.replace(/[^\w\s]/gi, ''); // Remove non-alphanumeric characters

			const markerEmbed = new EmbedBuilder()
				.setTitle('Twitch Event[Channel Marker Added]')
				.setAuthor({ name: `${userSearch.displayName}`, iconURL: `${userSearch.profilePictureUrl}` })
				.setColor('Red')
				.addFields([
					{
						name: 'Executer',
						value: `${msg.userInfo.displayName}`,
						inline: true
					},
					...(msg.userInfo.isMod
						? [{ name: 'Mod', value: 'Yes', inline: true }]
						: msg.userInfo.isBroadcaster
							? [{ name: 'Broadcaster', value: 'Yes', inline: true }]
							: []
					)
				])
				.setFooter({ text: `${msg.userInfo.displayName} just created a stream marker with description: ${sanitizedDescription} in ${channel}'s twitch channel` })
				.setTimestamp();

			// Check if user is authorized to use the command
			if (!isStaff) {
				await chatClient.say(channel, 'You do not have the required permission to use this command: Channel {Broadcaster or Editor}');
				return;
			}

			const createdSegment = await userApiClient.streams.createStreamMarker(broadcasterID.id, sanitizedDescription || undefined);
			const positionInSeconds = createdSegment.positionInSeconds;
			const streamTime = formatStreamTime(positionInSeconds);

			await chatClient.say(channel, `Stream Marker Created Successfully at ${streamTime}`);
			await commandUsage.send({ embeds: [markerEmbed] });
		} catch (error) {
			logger.error('Something went wrong creating a stream marker', error);
			await chatClient.say(channel, 'An error occurred while processing your request');
		}
	},
};

export default marker;