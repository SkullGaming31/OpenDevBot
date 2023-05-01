import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';

const vigor: Command = {
	name: 'vigor',
	description: 'Show information about vigor',
	usage: '!vigor [about, lore]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();

		const display = msg.userInfo.displayName;
		switch (args[0]) {
		case 'about':
			const vigorURL = 'https://vigorgame.com/about';
			chatClient.say(channel, `Outlive the apocalypse. Vigor is a free-to-play looter shooter set in post-war Norway. LOOT, SHOOT BUILD Shoot and loot in tense encounters Build your shelter and vital equipment Challenge others in various game modes Play on your own or fight together with 2 of your other friends, check out vigor here: ${vigorURL}`);
			break;
		case 'lore':
			chatClient.say(channel, 'not added yet');
			break;
		default:
			chatClient.say(channel, `${display}, Usage: ${vigor.usage}`);
			break;
		}
	}
};
export default vigor;