import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';

const warframe: Command = {
	name: 'warframe',
	description: 'get information about warframe the lore of warframe or my warframe MasteryRank(s)',
	usage: '!warframe [about|lore|mr]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		const display = msg.userInfo.displayName;
		switch (args[0]) {
		case 'about':
			chatClient.say(channel, 'Warframe is a free-to-play action role-playing third-person shooter multiplayer online game developed and published by Digital Extremes.');
			break;
		case 'lore':
			const warframeURL = 'https://warframe.com/landing';
			chatClient.say(channel, `In Warframe, players control members of the Tenno, a race of ancient warriors who have awoken from centuries of suspended animation far into Earth's future to find themselves at war in the planetary system with different factions. The Tenno use their powered Warframes along with a variety of weapons and abilities to complete missions. ${warframeURL}`);
			console.log('command being sent', warframe);
			break;
		case 'mr':
			const xblWFRank = 11;
			const ps4WFRank = 16;
			const pcWFRank = 1;
			chatClient.say(channel, `Mastery Rank: XBOX: ${xblWFRank}, PS4: ${ps4WFRank}, PC: ${pcWFRank}`);
			break;
		default:
			chatClient.say(channel, `${display}, Usage: ${warframe.usage}`);
			break;
		}
	}
};
export default warframe;