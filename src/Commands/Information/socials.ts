import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { broadcasterInfo } from '../../util/constants';

const socials: Command = {
	name: 'socials',
	description: 'A link to all my socials',
	usage: '!socials twitter|instagram|facebook|tiktok|discord|merch|tip|website|github',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();

		const socialURLs: Record<string, string> = {
			twitter: 'https://twitter.com/canadiendragon1',
			instagram: 'https://instagram.com/canadiendragon',
			tiktok: 'https://tiktok.com/@canadiendragon',
			discord: 'https://discord.com/invite/6TGV75sDjW',
			facebook: 'https://facebook.com/canadiendragon',
			youtube: 'https://www.youtube.com/channel/UCUHnQESlc-cPkp_0KvbVK6g',
			merch: 'https://canadiendragon-merch.creator-spring.com/',
			tip: 'https://overlay.expert/celebrate/canadiendragon',
			website: 'https://canadiendragon.com',
			github: 'https://github.com/skullgaming31/opendevbot',
		};

		const social = args[0]?.toLowerCase();

		if (channel !== '#canadiendragon') return;
		try {
			if (social && social in socialURLs) {
				const socialURL = socialURLs[social];
				await chatClient.say(channel, `${msg.userInfo.displayName}, ${broadcasterInfo[0].displayName}'s ${social}: ${socialURL}`);
			} else {
				await chatClient.say(channel, `Which social are you looking for? Usage: ${socials.usage}`);
			}	
		} catch (error) {
			console.error('Error Processing Socials Command ', error);
		}
	},
};
export default socials;