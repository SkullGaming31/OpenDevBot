import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';

interface Actions {
	[key: string]: string;
}

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

const me: Command = {
	name: 'me',
	description: 'do a random action to a another user in the chat',
	usage: '!me [name]',
	cooldown: 30000,
	/**
	 * Execute the me command.
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
		const { displayName } = msg.userInfo;
		const chatClient = await getChatClient();
		const target = args[0];

		if (!args[0] || !target.trim()) {
			return chatClient.say(channel, `${displayName}, usage: ${me.usage}`);
		}

		const actionCount = Object.keys(actions).length;
		const randomAction = Object.keys(actions)[Math.floor(Math.random() * actionCount)];

		await chatClient.say(channel, `${displayName} ${actions[randomAction]} ${target}`);
	},
};
export default me;