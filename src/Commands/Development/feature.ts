import { ChatMessage } from '@twurple/chat/lib';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import logger from '../../util/logger';

const feature: Command = {
	name: 'feature',
	cooldown: 10000,
	description: 'Let me know what feature you would like me to add to the twitch bot',
	usage: '!feature [name] <description>',
	/**
	 * Handles the '!feature' command to submit a feature request for the Twitch bot.
	 * 
	 * @param channel - The Twitch channel where the command was invoked.
	 * @param user - The user who invoked the command.
	 * @param args - The arguments passed with the command, where the first argument is the feature name and the rest is the description.
	 * @param text - The full text of the message.
	 * @param msg - The chat message object containing user and channel information.
	 * 
	 * Sends a feature request to a Discord channel via webhook if the command is invoked in the specified channel.
	 * The feature request includes the feature name, description, and the user's Twitch profile information.
	 * 
	 * Note: This command is restricted to the 'skullgaminghq' channel.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		void user; void text;
		try {
			const chatClient = await getChatClient();
			const userApiClient = await getUserApi();
			const FEATURE_REQUEST_TOKEN = process.env.DEV_DISCORD_FEATURE_REQUEST_TOKEN as string;
			const FEATURE_REQUEST_ID = process.env.DEV_DISCORD_FEATURE_REQUEST_ID as string;

			const featureWebhook = new WebhookClient({ id: FEATURE_REQUEST_ID, token: FEATURE_REQUEST_TOKEN });

			const usersSearch = await userApiClient.users.getUserById(msg.userInfo.userId);
			if (channel !== 'skullgaminghq') return chatClient.say(channel, 'This command is for skullgaminghqs Channel Only');

			const name: string = args[0];
			const description: string = args.slice(1).join(' ');

			if (!name || !description) return chatClient.say(channel, 'You must provide a name and description for the feature.');

			const featureEmbed = new EmbedBuilder().setColor('Purple');

			if (name) featureEmbed.setTitle(name);

			if (usersSearch?.name && usersSearch?.profilePictureUrl) featureEmbed.setAuthor({ name: usersSearch.name, iconURL: usersSearch.profilePictureUrl });

			featureEmbed.setDescription(description);
			featureEmbed.setURL(`https://twitch.tv/${usersSearch?.name.toLowerCase()}`);
			featureEmbed.setFooter({ text: `Feature request from ${msg.userInfo.userName}, userID: ${msg.userInfo.userId}` });
			featureEmbed.setTimestamp();

			await chatClient.say(channel, 'Feature request recorded.');
			await featureWebhook.send({ embeds: [featureEmbed] });
		} catch (error) {
			logger.error('Error handling feature request:', error);
			return;
		}
	}
};
export default feature;