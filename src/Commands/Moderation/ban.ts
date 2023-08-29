import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { CommandUssageWebhookTOKEN, broadcasterInfo, commandUsageWebhookID } from '../../util/constants';

const ban: Command = {
	name: 'ban',
	description: 'Ban a user from your twitch chat',
	usage: '!ban [@name] (reason)',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const display = msg.userInfo.displayName;
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });

		try {
			if (!args[1]) return chatClient.say(channel, `${display}, Usage: ${ban.usage}`);
			if (!args[2]) args[2] = 'No Reason Provided';
			if (args[2]) args.join(' ');
			const userSearch = await userApiClient.users.getUserByName(args[1].replace('@', ''));
			if (userSearch?.id === undefined) return;
			try {
				const channelEditor = await userApiClient.channels.getChannelEditors(broadcasterInfo?.id as UserIdResolvable);
				const editorData = channelEditor.map(editor => editor.userId === msg.userInfo.userId);
				if (!msg.userInfo.isMod || !msg.userInfo.isBroadcaster || !editorData) return;
				await userApiClient.moderation.banUser(broadcasterInfo?.id as UserIdResolvable, { user: userSearch?.id, reason: args[2] }).then(async () => { await chatClient.say(channel, `@${args[1].replace('@', '')} has been banned for Reason: ${args[2]}`); });

				const banEmbed = new EmbedBuilder()
					.setTitle('Twitch Channel Purge Event')
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
						},
						{
							name: 'Reason',
							value: `${args[2]}`,
							inline: true
						}
					])
					.setFooter({ text: `${msg.userInfo.displayName} just Banned ${args[1].replace('@', '')} in ${channel}'s twitch channel` })
					.setTimestamp();
				try {
					await chatClient.say(channel, `@${args[1].replace('@', '')} has been banned for Reason: ${args[2]}`);
					await commandUsage.send({ embeds: [banEmbed] });
				} catch (error) {
					console.error(error);
				}
			} catch (err) {
				console.error(err);
			}
		} catch (error) { console.error(error); }
	}
};
export default ban;