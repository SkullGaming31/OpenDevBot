import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { userID } from '../../util/constants';
import ChamberStateModel from '../../database/models/roulette';
import { randomInt } from 'node:crypto';
import { UserModel } from '../../database/models/userModel';

const MAX_BULLETS = 6;
const GOLD_MIN = 500;
const GOLD_MAX = 2500;
const funnyMessages = [
	'Oops! Better luck next time.',
	'Boom! That\'s gotta hurt.',
	'Yikes! Looks like you lost.',
	'You\'re out! Thanks for playing.',
	'That was close! But not close enough.',
	'Bang! And you\'re gone.',
	'Good try, but no cigar.',
	'Sorry! Better duck next time.',
	'Pow! You\'re out of here.',
	'Nice try, but the bullet found you.'
];

const roulette: Command = {
	name: 'roulette',
	description: 'Play a game of roulette!',
	usage: '!roulette',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();

		const broadcasterInfo = await userApiClient.channels.getChannelInfoById(userID);
		if (!broadcasterInfo?.id) return;

		const moderatorsResponse = await userApiClient.moderation.getModerators(broadcasterInfo.id as UserIdResolvable);
		const moderatorsData = moderatorsResponse.data;

		const isModerator = moderatorsData.some(moderator => moderator.userId === msg.userInfo.userId);
		const isBroadcaster = broadcasterInfo.id === msg.userInfo.userId;
		const isStaff = isModerator || isBroadcaster;

		if (!isStaff) {
			await chatClient.say(channel, `@${user}, you do not have permission to use this command.`);
			return;
		}

		try {
			let chamberState = await ChamberStateModel.findOne({ userId: msg.userInfo.userId });

			if (!chamberState) {
				chamberState = new ChamberStateModel({ userId: msg.userInfo.userId, bullets: 1 });
			}

			const randomPosition = randomInt(1, MAX_BULLETS + 1); // Generate a random position between 1 and MAX_BULLETS
			const bulletInChamber = randomPosition <= chamberState.bullets;

			if (bulletInChamber) {
				// Bullet is fired, user loses
				if (!msg.userInfo.isBroadcaster || !msg.userInfo.isMod) {
					await chatClient.say(channel, `@${msg.userInfo.displayName} Your lucky i dont have the power to time you out, YOU FAILED`);  
					chamberState.bullets = 1; // Reset the chamber to 1 bullet
				} else {
					await userApiClient.moderation.banUser(broadcasterInfo.id as UserIdResolvable, {
						user: msg.userInfo.userId as UserIdResolvable,
						reason: 'Lost at roulette',
						duration: 60
					});
					const randomMessageIndex = randomInt(0, funnyMessages.length);
					const randomMessage = funnyMessages[randomMessageIndex];
					await chatClient.say(channel, `@${msg.userInfo.displayName} has been Timed Out! They lost at roulette. ${randomMessage}`);
					chamberState.bullets = 1; // Reset the chamber to 1 bullet
				}
			} else {
				// Bullet is not fired, user wins
				const rewardGold = randomInt(GOLD_MIN, GOLD_MAX + 1); // Random gold reward between 500 and 2500
				await chatClient.say(channel, `@${msg.userInfo.displayName} survived the gunshot and earned ${rewardGold} gold!`);
				chamberState.bullets += 1; // Increase the bullets in the chamber

				// Add gold reward
				const userRecord = await UserModel.findOne({ id: msg.userInfo.userId });
				if (userRecord && userRecord.balance !== undefined) {
					userRecord.balance += rewardGold;
					console.log('updating UserData');
					await userRecord.save();
				} else {
					const newUser = new UserModel({ id: msg.userInfo.userId, balance: rewardGold, roles: 'USER' });
					console.log('New UserData Saved');
					await newUser.save();
				}

				if (chamberState.bullets > MAX_BULLETS) {
					chamberState.bullets = 1; // Reset the chamber to 1 bullet if it exceeds max bullets
				}
			}

			await chamberState.save();
		} catch (error) {
			console.error('Error in roulette command:', error);
			await chatClient.say(channel, 'An error occurred while playing roulette.');
		}
	},
};

export default roulette;