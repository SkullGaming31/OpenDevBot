import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';

const socials: Command = {
	name: 'socials',
	description: 'A link to all my socials',
	usage: '!social twitter|instagram|tiktok|discord|merch|tip|website|github',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		const display = msg.userInfo.displayName;

		const socialURLs: Record<string, string> = {
			twitter: 'https://twitter.com/canadiendragon',
			instagram: 'https://instagram.com/canadiendragon',
			tiktok: 'https://tiktok.com/@canadiendragon',
			discord: 'https://discord.com/invite/dHpehkD6M3',
			youtube: 'https://www.youtube.com/channel/UCaJPv2Hx2-HNwUOCkBFgngA',
			merch: 'https://canadiendragon-merch.creator-spring.com/',
			tip: 'https://overlay.expert/celebrate/canadiendragon',
			website: 'https://canadiendragon.com',
			github: 'https://github.com/skullgaming31/opendevbot',
		};

		const social = args[0]?.toLowerCase();

		if (social && social in socialURLs) {
			const socialURL = socialURLs[social];
			await chatClient.say(channel, `${display}, canadiendragon's ${social}: ${socialURL}`);
		} else {
			await chatClient.say(channel, `Which social are you looking for? Usage: ${socials.usage}`);
		}
	},
};
export default socials;