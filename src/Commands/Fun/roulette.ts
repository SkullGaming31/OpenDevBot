import type { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import { Command } from '../../interfaces/Command';
import { broadcasterInfo } from '../../util/constants';
import ChamberStateModel from '../../database/models/roulette';
import { randomInt } from 'node:crypto';
import balanceAdapter from '../../services/balanceAdapter';
import logger from '../../util/logger';

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
	/**
	 * Executes the roulette command, allowing users to play a game of roulette.
	 * Users have a chance to win or lose gold based on the outcome of the game.
	 *
	 * @param {string} channel The channel where the command was triggered.
	 * @param {string} user The user who triggered the command.
	 * @param {string[]} args The arguments passed to the command.
	 * @param {string} text The full text of the message that triggered the command.
	 * @param {ChatMessage} msg The message instance that triggered the command.
	 *
	 * @returns {Promise<void>} The result of the command execution.
	 */
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		void args; void text;
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();

		const broadcasterID = await userApiClient.channels.getChannelInfoById(broadcasterInfo[0].id);
		if (!broadcasterID?.id) return;

		const moderatorsResponse = await userApiClient.moderation.getModerators(broadcasterID.id as UserIdResolvable);
		const moderatorsData = moderatorsResponse.data;

		const isModerator = moderatorsData.some(moderator => moderator.userId === msg.userInfo.userId);
		const isBroadcaster = broadcasterID.id === msg.userInfo.userId;
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
					await userApiClient.moderation.banUser(broadcasterID.id as UserIdResolvable, {
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

				// Add gold reward to wallet (legacy UserModel) via adapter helper
				await balanceAdapter.creditWallet(msg.userInfo.userId ?? msg.userInfo.userName, rewardGold, msg.userInfo.userName, msg.channelId ?? undefined);

				if (chamberState.bullets > MAX_BULLETS) {
					chamberState.bullets = 1; // Reset the chamber to 1 bullet if it exceeds max bullets
				}
			}

			await chamberState.save();
		} catch (error) {
			logger.error('Error in roulette command:', error);
			await chatClient.say(channel, 'An error occurred while playing roulette.');
		}
	},
};

export default roulette;