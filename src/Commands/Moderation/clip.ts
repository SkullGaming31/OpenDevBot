import { UserIdResolvable } from '@twurple/api/lib';
import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { CommandUssageWebhookTOKEN, broadcasterInfo, commandUsageWebhookID } from '../../util/constants';
import { EmbedBuilder, WebhookClient } from 'discord.js';

const clipCommand: Command = {
	name: 'clip',
	description: 'Create a clip in the stream',
	usage: '!clip',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		console.log('Clip command executed.');
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });
		console.log('Initialized chat client, user API client, and command usage webhook.');
		const channelEditor = await userApiClient.channels.getChannelEditors(broadcasterInfo[0].id as UserIdResolvable);
		const isEditor = channelEditor.some(editor => editor.userId === msg.userInfo.userId);
		const isStaff = msg.userInfo.isBroadcaster || isEditor || msg.userInfo.isMod || msg.userInfo.isSubscriber || msg.userInfo.isVip;

		const clipEmbed = new EmbedBuilder()
			.setTitle('Twitch Event[Twitch Clip Created]')
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
			.setFooter({ text: `${msg.userInfo.displayName} just created a clip in ${channel}'s twitch channel`})
			.setTimestamp();
		// console.log('Clip embed created:', clipEmbed);

		if (broadcasterInfo) {
			const stream = await userApiClient.streams.getStreamByUserId(broadcasterInfo[0].id as UserIdResolvable);
			// console.log('Stream info:', stream);

			if (stream !== null) {
				if (isStaff) {
					const clipId = await userApiClient.clips.createClip({ channel: broadcasterInfo[0].id as UserIdResolvable, createAfterDelay: true });
					// console.log('Clip ID:', clipId);

					const clipUrl = `https://clips.twitch.tv/${clipId}`;
					await chatClient.say(channel, `Clip Created: ${clipUrl}`);
					// console.log('Clip URL sent to chat.', clipUrl);

					await commandUsage.send({ embeds: [clipEmbed] });
					// console.log('Command usage webhook sent.');
				} else {
					await chatClient.say(channel, 'You must be the broadcaster, mod, sub, or a VIP to use this command.');
					// console.log('User does not have required permissions.');
				}
			} else {
				await chatClient.say(channel, 'The stream must be live to use this command.');
				// console.log('Stream is not live.');
			}
		} else {
			console.error('broadcasterInfo is undefined.');
		}
	}
};
export default clipCommand;