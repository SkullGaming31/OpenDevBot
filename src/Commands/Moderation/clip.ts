import { UserIdResolvable } from '@twurple/api/lib';
import { ChatMessage } from '@twurple/chat/lib';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { CommandUssageWebhookTOKEN, broadcasterInfo, commandUsageWebhookID } from '../../util/constants';

const clipCommand: Command = {
	name: 'clip',
	description: 'Create a clip in the stream',
	usage: '!clip',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });
		const userSearch = await userApiClient.users.getUserByName(args[1].replace('@', ''));
		if (userSearch?.id === undefined) return;

		const clipEmbed = new EmbedBuilder()
			.setTitle('Twitch Channel Unmod Event')
			.setAuthor({ name: `${userSearch.displayName}`, iconURL: `${userSearch.profilePictureUrl}` })
			.setColor('Red')
			.addFields([
				{
					name: 'Executer',
					value: `${msg.userInfo.displayName}`,
					inline: true
				},
				{
					name: 'Mod',
					value: `${msg.userInfo.isMod}`,
					inline: true
				},
				{
					name: 'broadcaster',
					value: `${msg.userInfo.isBroadcaster}`,
					inline: true
				}
			])
			.setFooter({ text: `${msg.userInfo.displayName} just unmodded ${args[1].replace('@', '')} in ${channel}'s twitch channel` })
			.setTimestamp();

		if (broadcasterInfo) {
			const stream = await userApiClient.streams.getStreamByUserId(broadcasterInfo.id as UserIdResolvable);

			if (stream !== null) {
				if (msg.userInfo.isBroadcaster || msg.userInfo.isMod || msg.userInfo.isSubscriber || msg.userInfo.isVip) {
					const clipId = await userApiClient.clips.createClip({ channel: broadcasterInfo.id as UserIdResolvable, createAfterDelay: false });
					const clipUrl = `https://clips.twitch.tv/${clipId}`;
					await chatClient.say(channel, `Clip Created: ${clipUrl}`);
					// Code for using the clip URL
					commandUsage.send({ embeds: [clipEmbed] });
				} else {
					chatClient.say(channel, 'You must be the broadcaster, mod, sub, or a VIP to use this command.');
				}
			} else {
				chatClient.say(channel, 'The stream must be live to use this command.');
			}
		} else {
			console.error('Broadcaster info is undefined.');
		}
	}
};
export default clipCommand;