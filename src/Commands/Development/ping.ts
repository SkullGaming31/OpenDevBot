import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { User, UserModel } from '../../database/models/userModel';
import { Command } from '../../interfaces/apiInterfaces';
import { sleep } from '../../util/util';

const ping: Command = {
	name: 'ping',
	description: 'Displays Pong in chat',
	usage: '!ping',
	cooldown: 30000,
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const display = msg.userInfo.displayName;
		const username = user.toLowerCase();

		try {
			if (msg.userInfo.isBroadcaster) {
				const newBalance = await UserModel.findOneAndUpdate<User>({ username }, { balance: 1000000, id: msg.userInfo.userId }, { upsert: true, new: true });
				console.log('Balance: ' + newBalance?.balance);
				newBalance?.save().then(() => { console.log('New Balance Saved'); }).catch((err) => { console.error(err); });
			}
			// Implementation goes here
			const chatClient = await getChatClient();
	
			await sleep(2000);
			await chatClient.say(channel, `${display}, Im online and working correctly`);
		} catch (error) {
			console.error(error);
		}
	},
};

export default ping;