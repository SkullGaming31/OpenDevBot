import { ChatMessage } from '@twurple/chat/lib';
import { getChatClient } from '../../chat';
import { LurkMessageModel } from '../../database/models/LurkModel';
import { Command } from '../../interfaces/Command';
import { sleep } from '../../util/util';
import logger from '../../util/logger';

export const lurkingUsers: Set<string> = new Set<string>();
const lurk: Command = {
	name: 'lurk',
	description: 'Display a Lurk message and send it to anyone that tags you in chat',
	usage: '!lurk [on|off] (lurkMessage)',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		void text;
		const chatClient = await getChatClient();
		let shouldReportStatus = false;
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
						try {
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
							shouldReportStatus = true;
							await chatClient.say(channel, `${user} is now lurking with the message: ${message}`);
						} catch (err) {
							logger.warn('Failed to save lurk document for user', { user: msg.userInfo.userId, err });
							await chatClient.say(channel, `Sorry ${msg.userInfo.displayName}, enabling lurk failed due to an internal error.`);
						}
					} else {
						// Ensure the DB has a lurk document for this user and that displayNameLower is populated
						let lurkDoc = savedLurkMessage;
						if (lurkDoc) {
							lurkDoc.displayName = msg.userInfo.displayName;
							// Always update the lowercase copy to keep it in sync with displayName
							lurkDoc.displayNameLower = String(msg.userInfo.displayName).toLowerCase();
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
							const lurkMessage = lurkDoc.message || '';
							lurkingUsers.add(user);
							shouldReportStatus = true;
							await chatClient.say(channel, `${user} is now lurking ${lurkMessage ? `with the message: ${lurkMessage}` : 'No Lurk Message was Provided'}`);
						} catch (err) {
							logger.warn('Failed to save lurk document for user', { user: msg.userInfo.userId, err });
							await chatClient.say(channel, `Sorry ${msg.userInfo.displayName}, enabling lurk failed due to an internal error.`);
						}
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
					// Explicitly ensure no status report is sent when lurk is turned off
					shouldReportStatus = false;
					break;
			}
			if (shouldReportStatus) {
				await sleep(5000);
				await chatClient.say(channel, `Currently ${lurkingUsers.size} people are lurking. ${numLurkers}`);
			}
		} catch (error) {
			logger.error('Error with the Lurk Command', error);
		}
	},
};
export default lurk;