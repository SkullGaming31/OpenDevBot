import { ChatMessage } from '@twurple/chat/lib';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';

const featureWebhook = new WebhookClient({ url: process.env.DEV_DISCORD_FEATURE_REQUEST as string });

const feature: Command = {
	name: 'feature',
	cooldown: 10000,
	description: 'Let me know what feature you would like me to add to the twitch bot',
	usage: '!feature [name] <description>',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		try {
			const chatClient = await getChatClient();
			const userApiClient = await getUserApi();

			const usersSearch = await userApiClient.users.getUserById(msg.userInfo.userId);
			// code for command here
			const name: string = args[0];
			const description: string = args.slice(1).join(' '); // Combine args starting from index 1 into a single string

			if (!name || !description) return chatClient.say(channel, 'You must provide a name and description for the feature.');

			const featureEmbed = new EmbedBuilder();

			if (name) featureEmbed.setTitle(name);

			if (usersSearch?.name && usersSearch?.profilePictureUrl) featureEmbed.setAuthor({ name: usersSearch.name, iconURL: usersSearch.profilePictureUrl });

			featureEmbed.setDescription(description);
			featureEmbed.setFooter({ text: `Feature request from ${msg.userInfo.userName}, userID: ${msg.userInfo.userId}` });
			featureEmbed.setTimestamp();

			await chatClient.say(channel, 'Feature request recorded.');
			await featureWebhook.send({ embeds: [featureEmbed] });
		} catch (error) {
			console.error(error);
			return;
		}
	}
};

export default feature;