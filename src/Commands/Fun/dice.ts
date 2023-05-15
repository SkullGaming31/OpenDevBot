import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';

const dice: Command = {
	name: 'dice',
	description: 'Play a game of dice',
	usage: '!dice start to join the game, !dice bet <amount> to place a bet, and !dice roll to roll the dice.',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		await chatClient.say(channel, 'This COmmand has not been added yet');
	}
};
export default dice;