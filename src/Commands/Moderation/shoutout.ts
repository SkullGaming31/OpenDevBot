import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { CommandUssageWebhookTOKEN, TwitchActivityWebhookID, TwitchActivityWebhookToken, broadcasterInfo, commandUsageWebhookID } from '../../util/constants';
import { sleep } from '../../util/util';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { enqueueWebhook } from '../../Discord/webhookQueue';

const shoutout: Command = {
	name: 'shoutout',
	description: 'Shout out a user from the chat',
	usage: '!shoutout [@name]',
	/**
	 * Executes the shoutout command.
	 *
	 * @param channel The channel that the command was triggered in.
	 * @param user The user that triggered the command.
	 * @param args The arguments that were passed to the command.
	 * @param text The full text of the message that triggered the command.
	 * @param msg The message instance that triggered the command.
	 *
	 * @returns {Promise<void>} The result of the command execution.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });
		const TwitchActivity = new WebhookClient({ id: TwitchActivityWebhookID, token: TwitchActivityWebhookToken });

		try {
			if (!args[0]) return chatClient.say(channel, `Usage: ${shoutout.usage}`);

			const userSearch = await userApiClient.users.getUserByName(args[0].replace('@', ''));
			if (!userSearch?.id) return chatClient.say(channel, 'User not found.');

			const userChannelInfo = await userApiClient.channels.getChannelInfoById(userSearch.id as UserIdResolvable);
			const broadcasterStream = await userApiClient.streams.getStreamByUserId(broadcasterInfo[0].id as UserIdResolvable);

			const shoutoutMessage = `Yay! Look who's here! @${userSearch.displayName} just got mentioned! Let's all head over to their awesome Twitch channel at https://twitch.tv/${userSearch.displayName} and show them some love! By the way, if you're wondering what game they were last playing, it was ${userChannelInfo?.gameName}. So go check them out and join in on the fun!`;

			const commandUsageEmbed = new EmbedBuilder()
				.setTitle('CommandUsage[Shoutout]')
				.setAuthor({ name: msg.userInfo.displayName, iconURL: userSearch.profilePictureUrl })
				.setColor('Yellow')
				.addFields([
					{ name: 'Executer', value: msg.userInfo.displayName, inline: true },
					// Check if the user is a mod or broadcaster, and add the appropriate field
					...(msg.userInfo.isMod
						? [{ name: 'Mod', value: 'Yes', inline: true }]
						: msg.userInfo.isBroadcaster
							? [{ name: 'Broadcaster', value: 'Yes', inline: true }]
							: []
					)
				])
				.setFooter({ text: `${msg.userInfo.displayName} just shouted out ${userSearch.displayName} in ${channel}'s twitch channel` })
				.setTimestamp();

			const shoutoutEmbed = new EmbedBuilder()
				.setTitle('Twitch Shoutout')
				.setAuthor({ name: user, iconURL: userSearch.profilePictureUrl })
				.setColor('Green')
				.setDescription(shoutoutMessage)
				.setURL(`https://twitch.tv/${userChannelInfo?.name}`)
				.setFooter({ text: `${msg.userInfo.displayName} just shouted out ${userSearch.displayName} in ${channel}'s twitch channel` })
				.setTimestamp();

			if (userSearch.profilePictureUrl) {
				shoutoutEmbed.setImage(userSearch.profilePictureUrl);
				shoutoutEmbed.setThumbnail(userSearch.profilePictureUrl);
			} else {
				return;
			}

			await chatClient.say(channel, shoutoutMessage);
			await sleep(5000);
			if (broadcasterStream !== null) await userApiClient.chat.shoutoutUser(broadcasterInfo[0].id as UserIdResolvable, userSearch.id as UserIdResolvable);
			await sleep(3000);
			await enqueueWebhook(commandUsageWebhookID, CommandUssageWebhookTOKEN, { embeds: [commandUsageEmbed] });
			await sleep(5000);
			await enqueueWebhook(TwitchActivityWebhookID, TwitchActivityWebhookToken, { embeds: [shoutoutEmbed] });
		} catch (error: unknown) {
			if (error instanceof Error) {
				console.error(error.name + ': ' + error.message, error.stack);
				await chatClient.say(channel, `An error occurred: ${error.message}`);
			}
		}
	}
};
export default shoutout;