import { UserIdResolvable } from '@twurple/api';
import { ChatMessage } from '@twurple/chat/lib';
import { getUserApi } from '../../api/userApiClient';
import { getChatClient } from '../../chat';
import knownBotsModel, { Bots } from '../../database/models/knownBotsModel';
import { Command } from '../../interfaces/Command';
import { broadcasterInfo } from '../../util/constants';

const bots: Command = {
	name: 'bots',
	description: 'All known Bot names on Twitch',
	usage: '!bots [add|remove|list]',
	execute: async (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => {
		const chatClient = await getChatClient();
		const userApiClient = await getUserApi();
		const channelEditor = await userApiClient.channels.getChannelEditors(broadcasterInfo?.id as UserIdResolvable);

		const isEditor = channelEditor.map(editor => editor.userId === msg.userInfo.userId);

		const isStaff = isEditor || msg.userInfo.isMod || msg.userInfo.isMod;

		switch (args[0]) {
			case 'add':
				if (isStaff) {
					// Retrieve the usernames from the command arguments
					const usernamesToAdd = args.slice(1); // Exclude the command itself

					try {
						const newBots: Bots[] = []; // Array to store the new bot documents

						// Create a new bot document for each username
						for (const usernameToAdd of usernamesToAdd) {
							const usertoGet = await userApiClient.users.getUserByName(usernameToAdd);
							const newBot: Bots = new knownBotsModel({
								id: usertoGet?.id,
								username: usernameToAdd.toLowerCase(),
							});

							newBots.push(newBot);
						}

						// Save the bots to the database
						await knownBotsModel.insertMany(newBots);

						await chatClient.say(channel, `Successfully added ${usernamesToAdd.join(', ')} to the database.`);
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
				if (!isStaff) { return chatClient.say(channel, 'You must be a moderator, broadcaster or Channel Editor to use this command.'); }

				if (!args[1]) { return chatClient.say(channel, 'Please provide the usernames to remove.'); }

				const usernamesToRemove = args.slice(1);

				try {
					const result = await knownBotsModel.deleteMany({ username: { $in: usernamesToRemove } });
					const deletedCount = result.deletedCount || 0;

					if (deletedCount === 0) {
						await chatClient.say(channel, 'No matching users found in the database.');
					} else {
						await chatClient.say(channel, `${deletedCount} user(s) have been removed from the database: ${usernamesToRemove.join(', ')}.`);
					}
				} catch (error: any) {
					console.error('Error removing users:', error);
					await chatClient.say(channel, 'An error occurred while removing the users.');
				}
				break;
		}
	},
};

export default bots;