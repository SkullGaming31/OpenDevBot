import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';

const games: Command = {
	name: 'games',
	description: 'Play a game in twitch chat',
	usage: '!games [dice|dig|duel]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();

		const display = msg.userInfo.displayName;
		if (!args[0]) return chatClient.say(channel, `Usage: ${games.usage}`);
		switch (args[0]) {
		case 'dice':// 2 player + game highest roll wins, if more then 2 players get the same number they go into sudden death highest number wins
			const result = Math.floor(Math.random() * 12) + 1;
			chatClient.say(channel, `@${display}, you rolled a ${result}.`);
			break;
		case 'dig':// have a % chance to dig up the correct Hole and win currency prize Failed means you lose currency. -dig [amount] isFollower * 1.5 isSubscriber * 2
			/**
      		* Total: 5 holes
      		*  random number between 1-3 desides how many bombs are in play out of 5 holes
      		*/
			const choice = ['Succedded', 'Failed'];
			const results = choice[Math.floor(Math.random() * choice.length)];
			if (results === 'Succedded') {
				console.log('successful');
			} else {
				console.log('failed');
			}
			chatClient.say(channel, `@${display} you have ${results}`);
			break;
		case 'duel': // duel someone else for points winner takes all
			if (!args[1]) return chatClient.say(channel, 'you must tag someone to duel');
			if (!args[2]) return chatClient.say(channel, 'you must specify an amount to bet');
			break;
		default:
			chatClient.say(channel, 'you must specify which game you want to play, Usage: !games dice|dig|duel');
			break;
		}
	}
};
export default games;