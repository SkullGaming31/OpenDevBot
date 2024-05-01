import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { Embed, WebhookClient } from 'guilded.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { CommandUssageWebhookTOKEN, broadcasterInfo, commandUsageWebhookID } from '../../util/constants';

const setcategory: Command = {
	name: 'setcategory',
	aliases: ['setgame'],
	description: 'set the channel category for the broadcaster',
	usage: '!setcategory [gamename]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const userApiClient = await getUserApi();
		const chatClient = await getChatClient();

		const broadcasterResponse = await userApiClient.channels.getChannelInfoById(broadcasterInfo?.id as UserIdResolvable);
		if (!broadcasterResponse?.id) return;

		const moderatorsResponse = await userApiClient.moderation.getModerators(broadcasterInfo?.id as UserIdResolvable);
		const moderatorsData = moderatorsResponse.data; // Access the moderator data

		const channelEditor = await userApiClient.channels.getChannelEditors(broadcasterInfo?.id as UserIdResolvable);

		const isModerator = moderatorsData.some(moderator => moderator.userId === msg.userInfo.userId);
		const isBroadcaster = broadcasterResponse.id === msg.userInfo.userId;
		const isEditor = channelEditor.map(editor => editor.userId === msg.userInfo.userId);

		const isStaff = isModerator || isBroadcaster || isEditor;
		const commandUsageWebhook = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });
		const category = args.join(' ');
		const channelInfo = await userApiClient.channels.getChannelInfoById(broadcasterInfo?.id as UserIdResolvable);


		if (!args[0]) return chatClient.say(channel, `Usage: ${setcategory.usage}`);

		if (isStaff) {
			const newGame = await userApiClient.games.getGameByName(category);
			await userApiClient.channels.updateChannelInfo(broadcasterInfo?.id as UserIdResolvable, { gameId: `${newGame?.id}` });
			const helixUser = await userApiClient.users.getUserByName(msg.userInfo.userName);

			const commandEmbed = new Embed()
				.setTitle('Command Used [setcategory]')
				.setAuthor(`${helixUser?.displayName}`, helixUser?.profilePictureUrl)
				.setColor('Red')
				.addFields([
					{
						name: 'Command Executer:',
						value: `\`${msg.userInfo.displayName}\``,
						inline: true
					},
					{
						name: 'New Category:',
						value: `\`Gamename: ${newGame?.name}\`, \n||\`GameID: ${newGame?.id}\`||`,
						inline: true
					},
					{
						name: 'Old Category:',
						value: `\`Gamename: ${channelInfo?.gameName}\`, \n||\`GameID: ${channelInfo?.gameId}\`||`,
						inline: true
					},
					...(msg.userInfo.isMod
						? [{ name: 'Mod', value: 'Yes', inline: true }]
						: msg.userInfo.isBroadcaster
							? [{ name: 'Broadcaster', value: 'Yes', inline: true }]
							: []
					)
				])
				.setFooter(`Channel: ${channel}`)
				.setTimestamp();

			try {
				await chatClient.say(channel, `${msg.userInfo.displayName}, has changed the channel category to ${newGame?.name}`);
				await commandUsageWebhook.send({ embeds: [commandEmbed.toJSON()] });
				// console.log(`GameName: ${channelInfo?.gameName}, GameID: ${channelInfo?.gameId}`);
			} catch (error) {
				console.error(error);
			}
		} else {
			await chatClient.say(channel, `${msg.userInfo.displayName}, you are not a moderator or the broadcaster, you do not have access to this command`);
		}
	}
};
export default setcategory;