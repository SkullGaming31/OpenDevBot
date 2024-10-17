import { UserIdResolvable, UserNameResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { CommandUssageWebhookTOKEN, commandUsageWebhookID } from '../../util/constants';
import { EmbedBuilder, WebhookClient } from 'discord.js';

const setcategory: Command = {
	name: 'setcategory',
	aliases: ['setgame'],
	description: 'Set the channel category for the broadcaster',
	usage: '!setcategory [gamename]',
	/**
	 * Sets the channel category for the broadcaster if the user has the necessary permissions.
	 *
	 * @param channel - The channel where the command is issued.
	 * @param user - The user who issued the command.
	 * @param args - The arguments passed with the command, expected to contain the game name.
	 * @param text - The full text of the message containing the command.
	 * @param msg - The ChatMessage object representing the command message.
	 *
	 * @returns {Promise<void>}
	 *
	 * @description Checks whether the user is a moderator, broadcaster, or channel editor
	 * and updates the channel category to the specified game name if found. Sends appropriate
	 * feedback messages to the chat and logs the command usage.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const userApiClient = await getUserApi();
		const chatClient = await getChatClient();
		const commandUsageWebhook = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });

		if (!args[0]) return chatClient.say(channel, `Usage: ${setcategory.usage}`);

		const category = args.join(' ');

		// Get broadcaster information based on the channel where the command is issued
		const broadcaster = await userApiClient.users.getUserByName(channel as UserNameResolvable);
		if (!broadcaster) {
			return chatClient.say(channel, `Could not find broadcaster information for channel: ${channel}`);
		}

		const broadcasterResponse = await userApiClient.channels.getChannelInfoById(broadcaster.id as UserIdResolvable);
		const moderatorsResponse = await userApiClient.moderation.getModerators(broadcaster.id as UserIdResolvable);
		const channelEditor = await userApiClient.channels.getChannelEditors(broadcaster.id as UserIdResolvable);

		const isModerator = moderatorsResponse.data.some(moderator => moderator.userId === msg.userInfo.userId);
		const isBroadcaster = broadcasterResponse?.id === msg.userInfo.userId;
		const isEditor = channelEditor.some(editor => editor.userId === msg.userInfo.userId);

		const isStaff = isModerator || isBroadcaster || isEditor;

		if (isStaff) {
			const newGame = await userApiClient.games.getGameByName(category);
			if (!newGame) {
				return chatClient.say(channel, `Game "${category}" not found.`);
			}

			await userApiClient.channels.updateChannelInfo(broadcaster.id as UserIdResolvable, { gameId: `${newGame.id}` });
			const helixUser = await userApiClient.users.getUserByName(msg.userInfo.userName);

			const commandEmbed = new EmbedBuilder()
				.setTitle('Command Used [setcategory]')
				.setAuthor({ name: `${helixUser?.displayName}`, iconURL: helixUser?.profilePictureUrl })
				.setColor('Red')
				.addFields([
					{
						name: 'Command Executer:',
						value: `\`${msg.userInfo.displayName}\``,
						inline: true
					},
					{
						name: 'New Category:',
						value: `\`Gamename: ${newGame.name}\`, \n||\`GameID: ${newGame.id}\`||`,
						inline: true
					},
					{
						name: 'Old Category:',
						value: `\`Gamename: ${broadcasterResponse?.gameName}\`, \n||\`GameID: ${broadcasterResponse?.gameId}\`||`,
						inline: true
					},
					...(msg.userInfo.isMod
						? [{ name: 'Mod', value: 'Yes', inline: true }]
						: msg.userInfo.isBroadcaster
							? [{ name: 'Broadcaster', value: 'Yes', inline: true }]
							: []
					)
				])
				.setFooter({ text: `Channel: ${channel}` })
				.setTimestamp();

			try {
				await chatClient.say(channel, `${msg.userInfo.displayName} has changed the channel category to ${newGame.name}`);
				await commandUsageWebhook.send({ embeds: [commandEmbed] });
			} catch (error) {
				console.error(error);
			}
		} else {
			await chatClient.say(channel, `${msg.userInfo.displayName}, you are not a moderator or the broadcaster and do not have access to this command`);
		}
	}
};
export default setcategory;