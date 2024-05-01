import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { Embed, WebhookClient } from 'guilded.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { CommandUssageWebhookTOKEN, broadcasterInfo, commandUsageWebhookID } from '../../util/constants';

const settitle: Command = {
	name: 'settitle',
	description: 'Set the Channels title',
	usage: '!settitle [title]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const userApiClient = await getUserApi();
		const chatClient = await getChatClient();
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });

		if (!args[0]) return chatClient.say(channel, `Usage: ${settitle.usage}`);

		const title = args.join(' ');
		const broadcasterResponse = await userApiClient.channels.getChannelInfoById(broadcasterInfo?.id as UserIdResolvable);
		const channelEditor = await userApiClient.channels.getChannelEditors(broadcasterInfo?.id as UserIdResolvable);

		const isEditor = channelEditor.some(editor => editor.userId === msg.userInfo.userId);

		const isStaff = msg.userInfo.isMod || msg.userInfo.isBroadcaster || isEditor;
		await userApiClient.channels.updateChannelInfo(broadcasterResponse?.id!, { 'title': title }); // Channel ID:'31124455'
		const helixUser = await userApiClient.users.getUserByName(msg.userInfo.userName);
		try {
			if (isStaff) {
				const commandEmbed = new Embed()
					.setTitle('Command Used[settitle]')
					.setAuthor(msg.userInfo.displayName, helixUser?.profilePictureUrl)
					.setColor('Green')
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
							value: `\`${broadcasterResponse?.title}\``,
							inline: true
						},
						...(msg.userInfo.isMod
							? [{ name: 'Mod', value: 'Yes', inline: true }]
							: msg.userInfo.isBroadcaster
								? [{ name: 'Broadcaster', value: 'Yes', inline: true }]
								: []
						)
					])
					.setFooter(`Channel: ${channel}, user_id: ${msg.userInfo.userId}`)
					.setTimestamp();
				try {
					await chatClient.say(channel, `${msg.userInfo.displayName}, has updated the channel title to ${title}`);
					await commandUsage.send({ embeds: [commandEmbed.toJSON()] });
				} catch (error) {
					console.error(error);
				}
			} else {
				chatClient.say(channel, `${msg.userInfo.displayName}, you are not a moderator or the broadcaster you do not have access to this command`);
			}
		} catch (error: any) {
			console.error(error.message);
		}
	}
};
export default settitle;