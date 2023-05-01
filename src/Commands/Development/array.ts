import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { lurkingUsers } from '../Information/lurk';


const array: Command = {
	name: 'array',
	description: 'Resets Lurking array to empty',
	usage: '!array',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		if (!msg.userInfo.isMod) return;
		lurkingUsers.length = 0;
		chatClient.say(channel, 'Lurking Array set back to empty');
	}
};
export default array;