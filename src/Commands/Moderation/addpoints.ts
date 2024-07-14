import { UserIdResolvable, UserNameResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { WebhookClient, EmbedBuilder } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { IUser, UserModel } from '../../database/models/userModel';
import { Command } from '../../interfaces/Command';
import { CommandUssageWebhookTOKEN, commandUsageWebhookID } from '../../util/constants';

const addpoints: Command = {
	name: 'addpoints',
	description: 'Give points to a viewer',
	usage: '!addpoints <user> <amount>',
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
		const isStaff = msg.userInfo.isMod || msg.userInfo.isBroadcaster || isEditor;

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

		// Find the target user in the database
		const existingUser = await UserModel.findOne<IUser>({ username: targetUser, channelId: msg.channelId });

		if (existingUser) {
			// Calculate the new balance
			const currentBalance = existingUser.balance ?? 0; // Use 0 if balance is undefined
			const newBalance = currentBalance + amountToAdd;

			// Update the balance of the existing user
			existingUser.balance = newBalance;

			// Save the updated user document to the database
			const savedUser = await existingUser.save();

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
					{ name: 'Balance', value: `${amountToAdd}`, inline: false },
					{ name: 'New Balance', value: `${savedUser.balance}`, inline: true },
				])
				.setFooter({ text: `${msg.userInfo.displayName} just added points to ${args[0].replace('@', '')} in ${channel}'s twitch channel` })
				.setTimestamp();

			// Send a message to the chat confirming the points added
			await chatClient.say(channel, `Added ${amountToAdd} points to ${targetUser}. New balance: ${savedUser.balance}`);
			await commandUsage.send({ embeds: [addPointsEmbed] });
		} else {
			// User not found in the database
			await chatClient.say(channel, `User ${targetUser} not found.`);
		}
	}
};
export default addpoints;