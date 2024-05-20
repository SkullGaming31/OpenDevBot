import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import axios from 'axios';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { userID } from '../../util/constants';
import { EmbedBuilder, WebhookClient } from 'discord.js';

axios.defaults;

const bug: Command = {
	name: 'bug',
	description: 'Send a bug report to discord for the twitch chatbot',
	usage: '!bug <command> <bug description> NOTE: command name to file the bug about',
	cooldown: 30000,
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		try {
			const chatClient = await getChatClient();
			const userApiClient = await getUserApi();
			const bugWebhookID = process.env.BUG_REPORT_WEBHOOK_ID as string;
			const bugwebhooktoken = process.env.BUG_REPORT_WEBHOOK_TOKEN as string;
			const bugReport = new WebhookClient({ id: bugWebhookID, token: bugwebhooktoken });

			const broadcasterInfo = await userApiClient.channels.getChannelInfoById(userID);
			if (!broadcasterInfo?.id) return;


			const moderatorsResponse = await userApiClient.moderation.getModerators(broadcasterInfo.id as UserIdResolvable);
			const moderatorsData = moderatorsResponse.data; // Access the moderator data

			const isModerator = moderatorsData.some(moderator => moderator.userId === msg.userInfo.userId);
			const isBroadcaster = broadcasterInfo.id === msg.userInfo.userId;
			const isStaff = isModerator || isBroadcaster;
			const bugReportUser = await userApiClient.users.getUserById(msg.userInfo.userId);

			const commandtitle = args[0];
			const bugDescription = args.slice(1).join(' ');

			if (!args[0]) return chatClient.say(channel, `${bug.usage}`);
			if (!bugDescription) return chatClient.say(channel, `${bug.usage}`);

			const bugReportEmbed = new EmbedBuilder()
				.setTitle(`${commandtitle}`)
				.setAuthor({ name: `${bugReportUser?.displayName}`, iconURL: `${bugReportUser?.profilePictureUrl}`})
				.setDescription(bugDescription)
				.setColor('Red')
				.setFooter({ text: 'Provided by CanadienDragon' })
				.setTimestamp();

			if (bugDescription) {
				bugReportEmbed.setDescription(`${bugDescription}`);
			}

			if (bugDescription.length > 4096) return chatClient.say(channel, 'your description is to long if you can not reduce the description please join the discord and leave a bug report in opendevbot-twitch forum channel https://discord.com/invite/N7uMaDDSkj');

			await chatClient.say(channel, 'Bug Report Submitted, Thank You');
			await bugReport.send({ embeds: [bugReportEmbed] });
		} catch (error) {
			console.error(error);
		}
	},
};

export default bug;