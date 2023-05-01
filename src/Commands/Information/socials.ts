import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';

const socials: Command = {
	name: 'social',
	description: 'A link to all my socials',
	usage: '!social twitter|instagram|snapchat|facebook|tictok|discord|merch|tip|website',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		const display = msg.userInfo.displayName;
		switch (args[0]) {
		case 'instagram':
			await chatClient.say(channel, `${display}, canadiendragon's Instagram: https://instagram.com/canadiendragon`);
			break;
		case 'snapchat':
			chatClient.say(channel, `${display}, canadiendragon's Snapchat: https://snapchat.com/add/skullgaming31`);
			break;
		case 'facebook':
			chatClient.say(channel, `${display}, canadiendragon's Facebook: canadiendragon Entertainment`);
			break;
		case 'tiktok':
			chatClient.say(channel, `${display}, canadiendragon's Tik-Tok: https://tiktok.com/@canadiendragon`);
			break;
		case 'discord':
			chatClient.say(channel, `${display}, canadiendragon's Discord: https://discord.com/invite/dHpehkD6M3`);
			break;
		case 'youtube':
			chatClient.say(channel, `${display}, canadiendragon's Gaming YouTube Channel: https://www.youtube.com/channel/UCaJPv2Hx2-HNwUOCkBFgngA mostly just holds twitch archives`);
			break;
		case 'twitter':
			chatClient.say(channel, `${display}, canadiendragon's Twitter: https://twitter.com/canadiendragon`);
			break;
		case 'merch':
			const merch = 'https://canadiendragon-merch.creator-spring.com/';
			chatClient.say(channel, `${display}, The new merch is here, Would Appreciate it if you checked it out ${merch}`);
			break;
		case 'tip':
			const tipping = 'https://overlay.expert/celebrate/canadiendragon';
			chatClient.say(channel, `@${display}, you can help out the stream by tipping here: ${tipping}, NOTE: tips are NOT expected BUT very much appreacated, all tips go back into the stream wither it be upgrades for the stream or new games for you to watch.`);
			break;
		case 'website':
			const website_URL = 'https://canadiendragon.com';
			chatClient.say(channel, `${display}, website is ${website_URL}`);
			break;
		default:
			chatClient.say(channel, `Which social are you looking for?, Usage: ${socials.usage}`);
			break;
		}
	}
};
export default socials;