import { PrivateMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { userID } from '../../util/constants';

const readGame: Command = {
	name: 'game',
	description: 'Displays The game the streamer is playing',
	usage: '!game',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		console.log('testing');
    
		const display = msg.userInfo.displayName;
		const userApiClient = await getUserApi();
		const broadcasterID = await userApiClient.channels.getChannelInfoById(userID);
		if (broadcasterID?.id === undefined) return;
		const chatClient = await getChatClient();
		// Implementation goes here
		chatClient.say(channel, `${display}, ${broadcasterID?.displayName} is currently playing ${broadcasterID?.gameName} GameID: ${broadcasterID?.gameId}`);
	},
};

export default readGame;