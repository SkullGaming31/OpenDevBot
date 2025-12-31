import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { LurkMessageModel } from '../../database/models/LurkModel';
import { Command } from '../../interfaces/Command';
import { sleep } from '../../util/util';
import logger from '../../util/logger';

export const lurkingUsers: Set<string> = new Set<string>();
const lurk: Command = {
	name: 'lurk',
	description: 'Display a Lurk message and send it to anyone that tages you in chat',
	usage: '!lurk [on|off] (lurkMessage)',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		void text;
		const chatClient = await getChatClient();
		try {
			if (channel !== 'canadiendragon') return;
			logger.debug('hit this point');
			const toggle = args.shift();
			const message = args.join(' ');
			const savedLurkMessage = await LurkMessageModel.findOne({ id: msg.userInfo.userId });
			const numLurkers = await LurkMessageModel.countDocuments();

			if (!toggle || toggle === '') { return chatClient.say(channel, ` @${msg.userInfo.displayName} Usage: ${lurk.usage}`); }

			switch (toggle) {
				case 'on':
					logger.debug('hit on-case');
					if (message) {
						if (savedLurkMessage) {
							savedLurkMessage.message = message;
							savedLurkMessage.displayName = msg.userInfo.displayName;
							savedLurkMessage.displayNameLower = String(msg.userInfo.displayName).toLowerCase();
							await savedLurkMessage.save();
						} else {
							const newLurkMessage = new LurkMessageModel({
								id: msg.userInfo.userId,
								displayName: msg.userInfo.displayName,
								displayNameLower: String(msg.userInfo.displayName).toLowerCase(),
								message: message,
							});
							await newLurkMessage.save();
						}
						lurkingUsers.add(user);
						await chatClient.say(channel, `${user} is now lurking with the message: ${message}`);
					} else {
						// Ensure the DB has a lurk document for this user and that displayNameLower is populated
						let lurkDoc = savedLurkMessage;
						if (lurkDoc) {
							lurkDoc.displayName = msg.userInfo.displayName;
							if (!lurkDoc.displayNameLower) {
								lurkDoc.displayNameLower = String(msg.userInfo.displayName).toLowerCase();
							}
							if (!lurkDoc.message) {
								lurkDoc.message = '';
							}
						} else {
							lurkDoc = new LurkMessageModel({
								id: msg.userInfo.userId,
								displayName: msg.userInfo.displayName,
								displayNameLower: String(msg.userInfo.displayName).toLowerCase(),
								message: '',
							});
						}
						// persist any created/updated document
						try {
							await lurkDoc.save();
						} catch (err) {
							logger.warn('Failed to save lurk document for user', { user: msg.userInfo.userId, err });
						}
						const lurkMessage = lurkDoc.message || '';
						lurkingUsers.add(user);
						await chatClient.say(channel, `${msg.userInfo.displayName} is now lurking ${lurkMessage ? `with the message: ${lurkMessage}` : 'No Lurk Message was Provided'}`);
					}
					break;
				case 'off':
					if (lurkingUsers.has(user)) {
						lurkingUsers.delete(user);
						await sleep(3000);
						await chatClient.say(channel, `${msg.userInfo.displayName} is no longer lurking`);
					}
					if (savedLurkMessage) {
						await savedLurkMessage.deleteOne();
					}
					break;
			}
			await sleep(5000);
			await chatClient.say(channel, `Currently ${lurkingUsers.size} people are lurking. ${numLurkers}`);
		} catch (error) {
			logger.error('Error with the Lurk Command', error);
		}
	},
};
export default lurk;