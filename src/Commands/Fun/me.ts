import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';

const me: Command = {
	name: 'me',
	description: 'do a random action to a another user in the chat',
	usage: '!me [name]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();

		const display = msg.userInfo.displayName;
		const target = args[0];
		const action = ['slaps', 'kisses', 'hugs', 'punches', 'suckerPunches', 'kicks', 'pinches', 'uppercuts', 'licks', 'WacksWithFish'];
		const randomNumber = action[Math.floor(Math.random() * action.length)];
	
		if (!args[0]) return chatClient.say(channel, `${display}, usage: ${me.usage}`);
		chatClient.say(channel, `${display}, ${randomNumber} ${target}`);
	}
};
export default me;