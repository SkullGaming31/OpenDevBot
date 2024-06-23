import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import knownBotsModel, { Bots } from '../../database/models/knownBotsModel';
import { Command } from '../../interfaces/Command';
import { broadcasterInfo } from '../../util/constants';

// TODO: add the channel the bot was added from and who from that channel added the bot
// TODO: add logs to discord to show channel, user and bot name that was added to the database ex: modvlog(user) added drapsnatt(bot) from modvlog(channel)

const bots: Command = {
	name: 'bots',
	description: 'All known Bot names on Twitch(Known by me)',
	usage: '!bots [add|remove|list]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const channelEditor = await userApiClient.channels.getChannelEditors(broadcasterInfo?.id as UserIdResolvable);

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
								});
								newBots.push(newBot);
							}
						}

						if (newBots.length > 0) {
							await knownBotsModel.insertMany(newBots);
							await chatClient.say(channel, `Successfully added ${newUsernamesToAdd.join(', ')} to the database.`);
						} else {
							await chatClient.say(channel, 'All usernames provided are already in the database.');
						}
					} catch (error: any) {
						console.error('Failed to add usernames to the database:', error);
						await chatClient.say(channel, 'An error occurred while adding the usernames to the database.');
					}
				} else {
					await chatClient.say(channel, 'You must be a moderator or the broadcaster to use this command');
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
					console.error('Error retrieving bots:', error);
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
					}
				} catch (error: any) {
					console.error('Error removing users:', error);
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