import { HelixChannelEditor, UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import axios from 'axios';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { userID } from '../../util/constants';

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
	usage: '!marker <description>',
	moderator: true,
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();

		const broadcasterInfo = await userApiClient.channels.getChannelInfoById(userID);
		if (!broadcasterInfo?.id) return;

		const EditorResponse = await userApiClient.channels.getChannelEditors(broadcasterInfo.id as UserIdResolvable);

		const isEditor = EditorResponse.map((editor: HelixChannelEditor) => editor.userId === msg.userInfo.userId).join(', ');
		const isStaff = msg.userInfo.isMod || msg.userInfo.isBroadcaster || isEditor;
		const stream = await userApiClient.streams.getStreamByUserId(broadcasterInfo.id as UserIdResolvable);

		// Check if args have the description
		if (!args[0]) return chatClient.say(channel, `Usage: ${marker.usage}`);
		if (!isStaff) return chatClient.say(channel, 'You do not have the required permission to use this command: Channel {Broadcaster or Moderator}');

		try {
			if (stream !== null) {
				const tbd = userApiClient.streams.createStreamMarker(broadcasterInfo.id, args.join(' '));

				tbd.then(async (createdSegment) => {
					const positionInSeconds = createdSegment.positionInSeconds;

					// Use positionInSeconds to format and display the stream time
					const streamTime = formatStreamTime(positionInSeconds); // Replace with your formatting function

					await chatClient.say(channel, `Stream Marker Created Successfully at ${streamTime}`);
				}).catch((err) => { console.error('Something went wrong creating a stream marker', err); });
			} else {
				await chatClient.say(channel, 'The stream must be live to use this command');
			}

		} catch (error) {
			console.error(error);
		}
	},
};

export default marker;