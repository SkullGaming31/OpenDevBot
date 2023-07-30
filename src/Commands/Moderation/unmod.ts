import { ChatMessage } from '@twurple/chat/lib';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { TwitchActivityWebhookID, TwitchActivityWebhookToken, userID } from '../../util/constants';

const unmod: Command = {
	name: 'unmod',
	description: 'remove the moderator role from a user on twitch',
	usage: '!unmmod [@name]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const display = msg.userInfo.displayName;
		const twitchActivity = new WebhookClient({ id: TwitchActivityWebhookID, token: TwitchActivityWebhookToken });
		if (!args[1]) return chatClient.say(channel, `${display}, Usage: ${unmod.usage}`);
		try {
			if (!msg.userInfo.isMod || !msg.userInfo.isBroadcaster) return;
			const userSearch = await userApiClient.users.getUserByName(args[1].replace('@', ''));
			if (userSearch?.id === undefined) return;
			await userApiClient.moderation.removeModerator(userID, userSearch?.id).then(async () => { await chatClient.say(channel, `${args[1]} has had there moderator powers removed`); });
	
			const unModeratorEmbed = new EmbedBuilder()
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
					}
				])
				.setFooter({ text: `${msg.userInfo.displayName} just unmodded ${args[1].replace('@', '')} in ${channel}'s twitch channel` })
				.setTimestamp();
			await twitchActivity.send({ embeds: [unModeratorEmbed] });
		} catch (error) {
			console.error(error);
		}
	}
};
export default unmod;