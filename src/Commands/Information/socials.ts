import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { broadcasterInfo } from '../../util/constants';
import logger from '../../util/logger';

const socials: Command = {
	name: 'socials',
	description: 'A link to all my socials',
	usage: '!socials twitter|instagram|facebook|tiktok|discord|merch|tip|youtube|github',
	/**
	 * Executes the socials command.
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
		void user; void text;
		const chatClient = await getChatClient();

		const socialURLs: Record<string, string> = {
			twitter: 'https://twitter.com/skullgaminghq',
			instagram: 'https://instagram.com/skullgaminghq',
			tiktok: 'https://tiktok.com/@skullgaminghq',
			discord: 'https://discord.com/invite/6TGV75sDjW',
			// facebook: 'https://facebook.com/skullgaminghq',
			youtube: 'https://www.youtube.com/@SkullGamingHQ',
			tip: 'https://overlay.expert/celebrate/skullgaminghq',
			github: 'https://github.com/skullgaming31/opendevbot',
		};

		// const social = args[0]?.toLowerCase();

		if (channel !== 'skullgaminghq') return;

		try {
			const social = args[0]?.toLowerCase();
			if (!social) {
				// No social platform specified, show usage
				await chatClient.say(channel, `Which social are you looking for? Usage: ${socials.usage}`);
				return;
			}

			if (social in socialURLs) {
				const socialURL = socialURLs[social];
				await chatClient.say(channel, `${msg.userInfo.displayName}, ${broadcasterInfo[0].displayName}'s ${social}: ${socialURL}`);
			} else {
				// Unknown social platform, show error
				await chatClient.say(channel, `Unknown social platform: ${social}`);
			}
		} catch (error) {
			if (error instanceof Error) {
				logger.error(`Error: ${error.message}`);
			} else {
				logger.error(`Unknown error: ${error}`);
			}
		}
	},
};
export default socials;