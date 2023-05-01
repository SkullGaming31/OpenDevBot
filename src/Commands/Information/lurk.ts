import { PrivateMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { LurkMessageModel } from '../../database/models/LurkModel';
import { Command } from '../../interfaces/apiInterfaces';

export const lurkingUsers: string[] = [];
const lurk: Command = {
	name: 'lurk',
	description: 'Display a Lurk message and send it to anyone that tages you in chat',
	usage: '!lurk [on|off] (lurkMessage)',
	execute: async (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => {
		const chatClient = await getChatClient();
		const toggle = args.shift();
		const message = args.join(' ');
		const savedLurkMessage = await LurkMessageModel.findOne({ userId: msg.userInfo.userId });
		// const lurkingUsers: string[] = [];
		const numLurkers = await LurkMessageModel.countDocuments();
				
		if (toggle === 'on') {
			if (message) {
				if (savedLurkMessage) {
					savedLurkMessage.message = message;
					await savedLurkMessage.save();
				} else {
					await LurkMessageModel.create({ userId: msg.userInfo.userId, displayName: msg.userInfo.displayName, message });
				}
				lurkingUsers.push(user);
				chatClient.say(channel, `${user} is now lurking with the message: ${message}`);
			} else {
				const lurkMessage = savedLurkMessage ? savedLurkMessage.message : '';
				lurkingUsers.push(user);
				chatClient.say(channel, `${msg.userInfo.displayName} is now lurking ${lurkMessage ? `with the message: ${lurkMessage}` : 'No Lurk Message was Provided'}`);
			}
		} else if (toggle === 'off') {
			const index = lurkingUsers.indexOf(user);
			if (index > -1) {
				lurkingUsers.splice(index, 1);
				chatClient.say(channel, `${msg.userInfo.displayName} is no longer lurking`);
			}
			if (savedLurkMessage) {
				await savedLurkMessage.remove();
			}
		}
		chatClient.say(channel, `Currently ${numLurkers} people are lurking`);
	}
};
export default lurk;