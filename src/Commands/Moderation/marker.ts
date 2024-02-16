import { HelixChannelEditor, UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import axios from 'axios';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { CommandUssageWebhookTOKEN, commandUsageWebhookID, userID } from '../../util/constants';

axios.defaults;

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
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });

		const broadcasterInfo = await userApiClient.channels.getChannelInfoById(userID);
		if (!broadcasterInfo?.id) return;

		const EditorResponse = await userApiClient.channels.getChannelEditors(broadcasterInfo.id as UserIdResolvable);

		const isEditor = EditorResponse.some((editor: HelixChannelEditor) => editor.userId === msg.userInfo.userId);
		const isStaff = msg.userInfo.isMod || msg.userInfo.isBroadcaster || isEditor;
		const stream = await userApiClient.streams.getStreamByUserId(broadcasterInfo.id as UserIdResolvable);

		const userSearch = await userApiClient.users.getUserByName(msg.userInfo.userName);
		if (userSearch?.id === undefined) return;

		const description = args.slice(1).join(' ').trim(); // Join all args starting from index 1 into a single description
		const sanitizedDescription = description.replace(/[^\w\s]/gi, ''); // Remove non-alphanumeric characters

		const markerEmbed = new EmbedBuilder()
			.setTitle('Twitch Channel marker Event')
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
		if (!isStaff) return chatClient.say(channel, 'You do not have the required permission to use this command: Channel {Broadcaster or Moderator}');

		try {
			if (stream !== null) {
				const createdSegment = await userApiClient.streams.createStreamMarker(broadcasterInfo.id, sanitizedDescription || undefined);
				const positionInSeconds = createdSegment.positionInSeconds;
				const streamTime = formatStreamTime(positionInSeconds);

				await chatClient.say(channel, `Stream Marker Created Successfully at ${streamTime}`);
				await commandUsage.send({ embeds: [markerEmbed] });
			} else {
				await chatClient.say(channel, 'The stream must be live to use this command');
			}
		} catch (error) {
			console.error('Something went wrong creating a stream marker', error);
		}
	},
};
export default marker;