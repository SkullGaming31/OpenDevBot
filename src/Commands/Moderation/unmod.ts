import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { Embed, WebhookClient } from 'guilded.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { CommandUssageWebhookTOKEN, broadcasterInfo, commandUsageWebhookID } from '../../util/constants';

const unmod: Command = {
	name: 'unmod',
	description: 'remove the moderator role from a user on twitch',
	usage: '!unmmod [@name]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const display = msg.userInfo.displayName;

		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });
		if (!args[0]) return chatClient.say(channel, `${display}, Usage: ${unmod.usage}`);

		const channelEditor = await userApiClient.channels.getChannelEditors(broadcasterInfo?.id as UserIdResolvable);

		const isEditor = channelEditor.some(editor => editor.userId === msg.userInfo.userId);
		try {
			const userSearch = await userApiClient.users.getUserByName(args[0].replace('@', ''));
			if (userSearch?.id === undefined) return;

			const unModeratorEmbed = new Embed()
				.setTitle('Command Usage[Unmod]')
				.setAuthor(`${userSearch.displayName}`, `${userSearch.profilePictureUrl}`)
				.setColor('Red')
				.addFields([
					{
						name: 'Executer',
						value: `${display}`,
						inline: true
					},
					...(isEditor
						? [{ name: 'Channel Editor', value: 'Yes', inline: true }]
						: msg.userInfo.isBroadcaster
							? [{ name: 'Broadcaster', value: 'Yes', inline: true }]
							: []
					)
				])
				.setFooter(`${display} just unmodded ${args[0].replace('@', '')} in ${channel}'s twitch channel`)
				.setTimestamp();
			try {
				if (isEditor || msg.userInfo.isBroadcaster) {
					await userApiClient.moderation.removeModerator(broadcasterInfo?.id as UserIdResolvable, userSearch?.id as UserIdResolvable);
					await chatClient.say(channel, `${args[0]} has had there moderator powers removed by ${display}`);
					await commandUsage.send({ embeds: [unModeratorEmbed.toJSON()] });
				} else {
					await chatClient.say(channel, 'You Must be the Broadcaster or Channel Editor to use this command');
				}
			} catch (error) {
				console.error(error);
			}
		} catch (error) {
			console.error(error);
		}
	}
};
export default unmod;