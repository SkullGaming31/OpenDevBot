import type { ApiClient, HelixChannelEditor, UserIdResolvable, UserNameResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { WebhookClient, EmbedBuilder } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { IUser, UserModel } from '../../database/models/userModel';
import { deposit, getOrCreateAccount } from '../../services/economyService';
import { Command } from '../../interfaces/Command';
import logger from '../../util/logger';
import { CommandUssageWebhookTOKEN, commandUsageWebhookID } from '../../util/constants';

/**
 * Checks if a user is authorized to execute a command.
 *
 * @param msg The Twitch message that triggered the command.
 * @param userApiClient The Twitch API client instance.
 *
 * @returns A promise that resolves to true if the user is authorized, false otherwise.
 */
function isAuthorized(msg: ChatMessage, userApiClient: ApiClient): Promise<boolean> {
	return new Promise((resolve) => {
		const broadcaster = userApiClient.users.getUserById(msg.channelId as UserIdResolvable).then((broadcaster) => {
			if (!broadcaster) {
				resolve(false);
			} else {
				const channelEditor = userApiClient.channels.getChannelEditors(broadcaster.id as UserIdResolvable).then((channelEditor) => {
					const isEditor = channelEditor.some((editor: HelixChannelEditor) => editor.userId === msg.userInfo.userId);
					const isStaff = msg.userInfo.isMod || msg.userInfo.isBroadcaster || isEditor;
					resolve(isStaff);
				});
			}
		});
	});
}

const addpoints: Command = {
	name: 'addpoints',
	description: 'Give points to a viewer',
	usage: '!addpoints <user> <amount>',
	/**
	 * Execute the addpoints command to add points to a user's balance.
	 * 
	 * This function checks if the user is authorized to use the command and extracts the target user and amount 
	 * from the command arguments. It then adds the specified amount to the user's balance in the database and 
	 * sends a message to the chat confirming the points added.
	 * 
	 * @param channel - The channel where the command was issued.
	 * @param user - The user who issued the command.
	 * @param args - The command arguments, including the target user and the amount of points to add.
	 * @param text - The full text of the chat message.
	 * @param msg - The chat message object containing metadata and user information.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const commandUsage = new WebhookClient({ id: commandUsageWebhookID, token: CommandUssageWebhookTOKEN });

		// Check if the user is a mod, broadcaster, or ChannelEditor
		const broadcaster = await userApiClient.users.getUserByName(channel as UserNameResolvable);
		if (!broadcaster) {
			return chatClient.say(channel, `Could not find broadcaster information for channel: ${channel}`);
		}

		const channelEditor = await userApiClient.channels.getChannelEditors(broadcaster.id as UserIdResolvable);
		const isEditor = channelEditor.some(editor => editor.userId === msg.userInfo.userId);
		const isStaff = isAuthorized(msg, userApiClient);

		// Extract the target user and amount from the command arguments
		let targetUser = args[0];
		const amountToAdd = parseInt(args[1]);

		if (!isStaff) {
			return chatClient.say(channel, `${msg.userInfo.displayName}, You are not authorized to use this command.`);
		}
		if (!args[0] || !args[1]) {
			return chatClient.say(channel, `Usage: ${addpoints.usage}`);
		}
		if (isNaN(amountToAdd)) {
			return chatClient.say(channel, 'Invalid amount. Please provide a valid number.');
		}

		const userSearch = await userApiClient.users.getUserByName(args[0].replace('@', ''));
		if (!userSearch || userSearch.id === undefined) {
			return chatClient.say(channel, `User ${args[0]} not found.`);
		}

		// Remove '@' symbol from the target user's name
		if (targetUser.startsWith('@')) {
			targetUser = targetUser.substring(1).toLowerCase();
		}

		// Perform the deposit via the economy service (creates account if needed)
		try {
			const acct = await deposit(userSearch.id, amountToAdd, undefined, { admin: { id: msg.userInfo.userId, name: msg.userInfo.displayName }, channel });

			const addPointsEmbed = new EmbedBuilder()
				.setTitle('Twitch Event [Addpoints]')
				.setAuthor({ name: `${userSearch.displayName}`, iconURL: `${userSearch.profilePictureUrl}` })
				.setColor('Green')
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
					),
					{ name: 'Balance Added', value: `${amountToAdd}`, inline: false },
					{ name: 'New Balance', value: `${acct.balance}`, inline: true },
				])
				.setFooter({ text: `${msg.userInfo.displayName} just added points to ${args[0].replace('@', '')} in ${channel}'s twitch channel` })
				.setTimestamp();

			// Send a message to the chat confirming the points added
			await chatClient.say(channel, `Added ${amountToAdd} points to ${targetUser}. New balance: ${acct.balance}`);
			await commandUsage.send({ embeds: [addPointsEmbed] });
		} catch (err: any) {
			logger.error('Error adding points:', err);
			await chatClient.say(channel, `Failed to add points: ${err?.message ?? 'unknown error'}`);
		}
	}
};
export default addpoints;