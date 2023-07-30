import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';

const dayz: Command = {
	name: 'dayz',
	description: 'Find out where to find items in dayz',
	usage: '!dayz',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		// const items: Item = JSON.parse(fs.readFileSync('./src/Item_Data.json', 'utf8'));
	}
};
export default dayz;