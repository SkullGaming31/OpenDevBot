import { PrivateMessage } from '@twurple/chat/lib';
import fetch from 'node-fetch';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/apiInterfaces';
import { sleep } from '../../util/util';

const ping: Command = {
	name: 'ping',
	description: 'Displays Pong in chat',
	usage: '!ping',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const display = msg.userInfo.displayName;

		fetch('https://content.warframe.com/dynamic/worldState.php')
			.then(response => response.json())
			.then(data => console.log(data))
			.catch(error => console.error(error));
		// Implementation goes here
		const chatClient = await getChatClient();

		await sleep(2000);
		await chatClient.say(channel, `${display}, Im online and working correctly`);
	},
};

export default ping;