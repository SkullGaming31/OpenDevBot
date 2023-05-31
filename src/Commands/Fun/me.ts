import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';

interface Actions {
  [key: string]: string;
}

const me: Command = {
	name: 'me',
	description: 'do a random action to a another user in the chat',
	usage: '!me [name]',
	cooldown: 30000,
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const { displayName } = msg.userInfo;
		const chatClient = await getChatClient();
		const target = args[0];
		const actions: Actions = {
			slaps: 'slaps',
			kisses: 'kisses',
			hugs: 'hugs',
			punches: 'punches',
			suckerPunches: 'sucker punches',
			kicks: 'kicks',
			pinches: 'pinches',
			uppercuts: 'uppercuts',
			licks: 'licks',
			wacksWithFish: 'wacks with a fish',
			tickles: 'tickles',
			highFives: 'high-fives',
			headbutts: 'headbutts',
			dancesWith: 'dances with',
			winksAt: 'winks at',
		};
		const randomAction = Object.keys(actions)[
			Math.floor(Math.random() * Object.keys(actions).length)
		];

		if (!args[0]) { return chatClient.say(channel, `${displayName}, usage: ${me.usage}`); }

		await chatClient.say(channel, `${displayName}, ${actions[randomAction]} ${target}`);
	},
};
export default me;