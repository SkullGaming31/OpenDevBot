import type { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import knownBotsModel, { Bots } from '../../database/models/knownBotsModel';
import { Command } from '../../interfaces/Command';
import { broadcasterInfo, commandUsageWebhookID, CommandUsageWebhookTOKEN } from '../../util/constants';
import logger from '../../util/logger';
import { enqueueWebhook } from '../../Discord/webhookQueue';
import { EmbedBuilder } from 'discord.js';

// TODO: add the channel the bot was added from and who from that channel added the bot
// TODO: add logs to discord to show channel, user and bot name that was added to the database ex: modvlog(user) added drapsnatt(bot) from modvlog(channel)

const bots: Command = {
	name: 'bots',
	description: 'All known Bot names on Twitch(Known by me)',
	usage: '!bots [add|info|remove|list]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		void user; void text;
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const channelEditor = await userApiClient.channels.getChannelEditors(broadcasterInfo[0].id as UserIdResolvable);

		const isEditor = channelEditor.some(editor => editor.userId === msg.userInfo.userId);

		const isStaff = isEditor || msg.userInfo.isMod || msg.userInfo.isBroadcaster;
		if (!args[0]) return chatClient.say(channel, `Usage: ${bots.usage}`);

		switch (args[0]) {
			case 'add':
				if (isStaff) {
					const usernamesToAdd = args.slice(1).map(username => username.toLowerCase());

					try {
						const existingBots = await knownBotsModel.find({ username: { $in: usernamesToAdd } });
						const existingUsernames = existingBots.map(bot => bot.username);

						const newUsernamesToAdd = usernamesToAdd.filter(username => !existingUsernames.includes(username));
						const newBots: Bots[] = [];

						for (const usernameToAdd of newUsernamesToAdd) {
							const userToGet = await userApiClient.users.getUserByName(usernameToAdd);
							if (userToGet?.id) {
								const newBot: Bots = new knownBotsModel({
									id: userToGet.id,
									username: usernameToAdd.toLowerCase(),
									addedBy: msg.userInfo.displayName || msg.userInfo.userId,
									addedFromChannel: channel.startsWith('#') ? channel.slice(1) : channel,
									addedAt: new Date()
								});
								newBots.push(newBot);
							}
						}

						if (newBots.length > 0) {
							await knownBotsModel.insertMany(newBots);
							await chatClient.say(channel, `Successfully added ${newUsernamesToAdd.join(', ')} to the database.`);
							// Send Discord log via enqueueWebhook if webhook configured
							try {
								if (commandUsageWebhookID && CommandUsageWebhookTOKEN) {
									const embed = new EmbedBuilder()
										.setTitle('Bot(s) Added')
										.setColor('Green')
										.addFields([
											{ name: 'Added By', value: msg.userInfo.displayName || msg.userInfo.userId, inline: true },
											{ name: 'Channel', value: channel.startsWith('#') ? channel.slice(1) : channel, inline: true },
											{ name: 'Bots', value: newUsernamesToAdd.join(', '), inline: false },
											{ name: 'Bot Details', value: newBots.map((b) => `${b.username} (${b.id})`).join('\n'), inline: false }
										])
										.setTimestamp();
									await enqueueWebhook(commandUsageWebhookID, CommandUsageWebhookTOKEN, { embeds: [embed] });
								}
							} catch (e: unknown) {
								logger.error('Failed to enqueue bot-add webhook', String(e));
							}
						} else {
							await chatClient.say(channel, 'All usernames provided are already in the database.');
						}
					} catch (error: unknown) {
						logger.error('Failed to add usernames to the database:', String(error));
						await chatClient.say(channel, 'An error occurred while adding the usernames to the database.');
					}
				} else {
					await chatClient.say(channel, 'You must be a moderator or the broadcaster to use this command');
				}
				break;

			case 'info':
				if (!args[1]) return chatClient.say(channel, 'Usage: !bots info <name>');
				try {
					const name = args[1].toLowerCase();
					const bot = await knownBotsModel.findOne({ username: name }).lean();
					if (!bot) {
						await chatClient.say(channel, `No information found for ${args[1]}.`);
						break;
					}
					const addedBy = bot.addedBy ?? 'unknown';
					const addedFrom = bot.addedFromChannel ?? 'unknown';
					const addedAt = bot.addedAt ? new Date(bot.addedAt).toLocaleString() : 'unknown';
					await chatClient.say(channel, `${bot.username} — added by ${addedBy} on ${addedAt} in channel ${addedFrom}`);
				} catch (error: unknown) {
					logger.error('Error retrieving bot info:', String(error));
					await chatClient.say(channel, 'An error occurred while retrieving bot information.');
				}
				break;

			case 'list':
				try {
					const botCount = await knownBotsModel.countDocuments();
					if (botCount === 0) {
						await chatClient.say(channel, 'There are no bots in the database. Add bots using the command !bots add <name>');
					} else {
						const bots = await knownBotsModel.find<Bots>({}, 'username');
						const botUsernames = bots.map((bot) => bot.username);
						await chatClient.say(channel, `Known bots: ${botUsernames.join(', ')}`);
					}
				} catch (error) {
					logger.error('Error retrieving bots:', error);
					await chatClient.say(channel, 'An error occurred while retrieving bots.');
				}
				break;

			case 'remove':
				if (!isStaff) return chatClient.say(channel, 'You must be a moderator, broadcaster, or Channel Editor to use this command.');
				if (!args[1]) return chatClient.say(channel, 'Please provide the usernames to remove.');

				const usernamesToRemove = args.slice(1).map(username => username.toLowerCase());

				try {
					const existingBotsToRemove = await knownBotsModel.find({ username: { $in: usernamesToRemove } });
					const existingUsernamesToRemove = existingBotsToRemove.map(bot => bot.username.toLowerCase());

					if (existingUsernamesToRemove.length === 0) {
						await chatClient.say(channel, 'No matching users found in the database.');
					} else {
						await knownBotsModel.deleteMany({ username: { $in: existingUsernamesToRemove } });
						await chatClient.say(channel, `${existingUsernamesToRemove.length} user(s) have been removed from the database: ${existingUsernamesToRemove.join(', ')}.`);
						// Send Discord removal log via enqueueWebhook if webhook configured
						try {
							if (commandUsageWebhookID && CommandUsageWebhookTOKEN) {
								const embed = new EmbedBuilder()
									.setTitle('Bot(s) Removed')
									.setColor('Red')
									.addFields([
										{ name: 'Removed By', value: msg.userInfo.displayName || msg.userInfo.userId, inline: true },
										{ name: 'Channel', value: channel.startsWith('#') ? channel.slice(1) : channel, inline: true },
										{ name: 'Bots Removed', value: existingUsernamesToRemove.join(', '), inline: false }
									])
									.setTimestamp();
								await enqueueWebhook(commandUsageWebhookID, CommandUsageWebhookTOKEN, { embeds: [embed] });
							}
						} catch (e: unknown) {
							logger.error('Failed to enqueue promote webhook for removals', String(e));
						}
					}
				} catch (error: unknown) {
					logger.error('Error removing users:', String(error));
					await chatClient.say(channel, 'An error occurred while removing the users.');
				}
				break;
			default:
				await chatClient.say(channel, `Invalid subcommand. Usage: ${bots.usage}`);
				break;
		}
	},
};

export default bots;