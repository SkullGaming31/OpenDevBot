import { ChatMessage } from '@twurple/chat/lib';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { CommandUssageWebhookTOKEN, commandUsageWebhookID, userID } from '../../util/constants';

const settitle: Command = {
	name: 'settitle',
	description: 'Set the Channels title',
	usage: '!settitle [title]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const userApiClient = await getUserApi();
		const chatClient = await getChatClient();
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });

		const staff = msg.userInfo.isMod || msg.userInfo.isBroadcaster;
		const display = msg.userInfo.displayName;
		const title = args.join(' ');
		const canadiendragon = await userApiClient.channels.getChannelInfoById(userID);
		if (!args[0]) return chatClient.say(channel, `Usage: ${settitle.usage}`);

		try {
			if (staff) {
				await userApiClient.channels.updateChannelInfo(canadiendragon?.id!, { 'title': title }); // Channel ID:'31124455'
				chatClient.say(channel, `${msg.userInfo.displayName}, has updated the channel title to ${title}`);
				const helixUser = await userApiClient.users.getUserByName(msg.userInfo.userName);
				const commandEmbed = new EmbedBuilder()
					.setTitle('Command Used[settitle]')
					.setAuthor({ name: msg.userInfo.displayName, iconURL: helixUser?.profilePictureUrl })
					.setColor('Red')
					.addFields([
						{
							name: 'Command Executer: ',
							value: `\`${msg.userInfo.displayName}\``,
							inline: true
						},
						{
							name: 'New Title: ',
							value: `\`${title}\``,
							inline: true
						},
						{
							name: 'Old Title',
							value: `\`${canadiendragon?.title}\``,
							inline: true
						}
					])
					.setFooter({ text: `Channel: ${channel.replace('#', '')}, TwitchID: ${msg.userInfo.userId}` })
					.setTimestamp();
				await commandUsage.send({ embeds: [commandEmbed] });
			} else {
				chatClient.say(channel, `${display}, you are not a moderator or the broadcaster you do not have access to this command`);
			}
		} catch (error: any) {
			console.error(error.message);
		}
	}
};
export default settitle;