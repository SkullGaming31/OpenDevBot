import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { LurkMessageModel } from '../../database/models/LurkModel';
import { Command } from '../../interfaces/apiInterfaces';
import { sleep } from '../../util/util';

export const lurkingUsers: string[] = [];
const lurk: Command = {
	name: 'lurk',
	description: 'Display a Lurk message and send it to anyone that tages you in chat',
	usage: '!lurk [on|off] (lurkMessage)',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const toggle = args.shift();
		const message = args.join(' ');
		const savedLurkMessage = await LurkMessageModel.findOne({ id: msg.userInfo.userId });
		const numLurkers = await LurkMessageModel.countDocuments();

		if (!toggle || toggle === '') { return chatClient.say(channel, `Usage: ${lurk.usage}`); }

		switch (toggle) {
		case 'on':
			if (message) {
				if (savedLurkMessage) {
					savedLurkMessage.message = message;
					await savedLurkMessage.save();
				} else {
					const newLurkMessage = new LurkMessageModel({
						id: msg.userInfo.userId,
						displayName: msg.userInfo.displayName,
						message: message,
					});
					await newLurkMessage.save();
				}
				lurkingUsers.push(user);
				await chatClient.say(channel, `${user} is now lurking with the message: ${message}`);
			} else {
				const lurkMessage = savedLurkMessage ? savedLurkMessage.message : '';
				lurkingUsers.push(user);
				await chatClient.say(
					channel,
					`${msg.userInfo.displayName} is now lurking ${lurkMessage ? `with the message: ${lurkMessage}` : 'No Lurk Message was Provided'}`,
				);
			}
			break;
		case 'off':
			const index = lurkingUsers.indexOf(user);
			if (index > -1) {
				lurkingUsers.splice(index, 1);
				await sleep(3000);
				await chatClient.say(channel, `${msg.userInfo.displayName} is no longer lurking`);
			}
			if (savedLurkMessage) {
				await savedLurkMessage.remove();
			}
			break;
		}
		await sleep(5000);
		await chatClient.say(channel, `Currently ${lurkingUsers.length} people are lurking`);
	},
};
export default lurk;