import { ChatMessage } from '@twurple/chat/lib';
import { EmbedBuilder, WebhookClient } from 'discord.js';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';

const feature: Command = {
	name: 'feature',
	cooldown: 10000,
	description: 'Let me know what feature you would like me to add to the twitch bot',
	usage: '!feature [name] <description>',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		try {
			const chatClient = await getChatClient();
			const userApiClient = await getUserApi();
			const FEATURE_REQUEST_TOKEN = process.env.DEV_DISCORD_FEATURE_REQUEST_TOKEN as string;
			const FEATURE_REQUEST_ID = process.env.DEV_DISCORD_FEATURE_REQUEST_ID as string;

			const featureWebhook = new WebhookClient({ id: FEATURE_REQUEST_ID, token: FEATURE_REQUEST_TOKEN });

			const usersSearch = await userApiClient.users.getUserById(msg.userInfo.userId);
			
			const name: string = args[0];
			const description: string = args.slice(1).join(' '); // Combine args starting from index 1 into a single string

			if (!name || !description) return chatClient.say(channel, 'You must provide a name and description for the feature.');

			const featureEmbed = new EmbedBuilder().setColor('Purple');

			if (name) featureEmbed.setTitle(name);

			if (usersSearch?.name && usersSearch?.profilePictureUrl) featureEmbed.setAuthor({ name: usersSearch.name, iconURL: usersSearch.profilePictureUrl });

			featureEmbed.setDescription(description);
			featureEmbed.setURL(`https://twitch.tv/${usersSearch?.name.toLowerCase()}`);
			featureEmbed.setFooter({ text: `Feature request from ${msg.userInfo.userName}, userID: ${msg.userInfo.userId}`});
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