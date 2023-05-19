import { ChatClient } from '@twurple/chat';
import { PrivateMessage } from '@twurple/chat/lib';

import { EmbedBuilder, WebhookClient } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { getUserApi } from './api/userApiClient';
import { getAuthProvider } from './auth/authProvider';
import { LurkMessageModel } from './database/models/LurkModel';
import knownBotsModel, { Bots } from './database/models/knownBotsModel';
import UserModel, { User } from './database/models/userModel';
import { Command } from './interfaces/apiInterfaces';
import { TwitchActivityWebhookID, TwitchActivityWebhookToken, userID } from './util/constants';

// Function to generate the list of available commands
// function generateCommandList(): string { return 'Available commands: !' + Array.from(commands).join(', !'); }

export const commands: Set<string> = new Set<string>();
async function loadCommands(commandsDir: string, commands: Record<string, Command>): Promise<void> {
	const commandModules = fs.readdirSync(commandsDir);

	for (const module of commandModules) {
		const modulePath = path.join(commandsDir, module);

		if (fs.statSync(modulePath).isDirectory()) {
			await loadCommands(modulePath, commands); // Recursively load commands in subdirectories
			continue;
		}

		if (!module.endsWith('.ts') || module === 'index.ts') continue;

		const { name } = path.parse(module);
		const command = (await import(modulePath)).default;
		commands[name] = command;
		registerCommand(command);
		// if (command.aliases) {
		// 	for (const alias of command.aliases) {
		// 		registerCommand(command.aliases);
		// 	}
		// }
		// console.log(command);
	}
}

export async function initializeChat(): Promise<void> {
	// Load commands
	const chatClient = await getChatClient();
	const commandsDir = path.join(__dirname, 'commands');
	const commands: Record<string, Command> = {};
	await loadCommands(commandsDir, commands);
	console.log(`Loaded ${Object.keys(commands).length} commands.`);
	// const lurkingUsers: string[] = [];
	const userApiClient = await getUserApi();
	const twitchActivity = new WebhookClient({ id: TwitchActivityWebhookID, token: TwitchActivityWebhookToken });
	const getSavedLurkMessage = async (displayName: string) => { return LurkMessageModel.findOne({ displayName }); };

	// Handle commands
	const commandHandler = async (channel: string, user: string, text: string, msg: PrivateMessage) => {
		console.log(`${msg.userInfo.displayName} Said: ${text} in ${channel}`);
		
		// const chatters = await userApiClient.chat.getChatters(userID, userID);
		// setInterval(async () => {
		// 	for (const chatter of chatters.data) {
		// 		const user = await UserModel.findOne<User>({ username: chatter.userName }).lean();
		// 		const knownBots = await knownBotsModel.findOne<Bots>({ username: chatter.userName });
		// 		const tbd = await chatter.getUser();
		// 		console.log( chatter.userName + ' : ' + tbd.creationDate);

		// 		console.log('chatter.userName:', chatter.userName);
		// 		console.log('knownBots.username:', knownBots?.username);

		// 		if (knownBots && chatter.userName.toLowerCase() === knownBots.username.toLowerCase()) {
		// 			console.log('Skipping known bot:', chatter.userName);
		// 			continue; // Skip giving coins to known bots
		// 		}

		// 		if (!user) {
		// 			const newUser = new UserModel({
		// 				id: chatter.userId,
		// 				username: chatter.userName,
		// 				balance: 100,
		// 			});
		// 			console.log('Added the user to the database: ' + newUser.balance);
		// 			await newUser.save();
		// 		} else {
		// 			if (chatter.userName === 'opendevbot' || chatter.userName === 'streamelements' || chatter.userName === 'streamlabs') {
		// 				console.log('Skipping bot:', chatter.userName);
		// 				continue; // Skip giving coins to specific usernames
		// 			}

		// 			const updatedBalance = (user.balance || 0) + 100;
		// 			await UserModel.findOneAndUpdate(
		// 				{ username: chatter.userName },
		// 				{ $set: { balance: updatedBalance } },
		// 				{ new: true }
		// 			);
		// 			console.log('Updated ' + chatter.userName + ' and gave them ' + updatedBalance + ' coins');
		// 		}
		// 	}
		// }, 5 * 60 * 1000); // 5 * 60 * 1000 5 minutes

		const chatters = await userApiClient.chat.getChatters(userID, userID);
		const chunkSize = 100; // Desired number of chatters per chunk
		const intervalDuration = 5 * 60 * 1000; // Interval duration in milliseconds (5 minutes)
		const requestsPerInterval = 800; // Maximum number of requests allowed per interval

		const totalChunks = Math.ceil(chatters.data.length / chunkSize); // Total number of chunks
		const requestsPerChunk = Math.ceil(requestsPerInterval / totalChunks); // Maximum number of requests allowed per chunk
		const intervalDurationPerRequest = intervalDuration / requestsPerInterval; // Interval duration per request

		let chunkIndex = 0; // Counter for tracking the current chunk index
		let requestIndex = 0; // Counter for tracking the current request index

		const processChatters = async () => {
			const start = chunkIndex * chunkSize;
			const end = (chunkIndex + 1) * chunkSize;
			const chattersChunk = chatters.data.slice(start, end);

			for (const chatter of chattersChunk) {
				for (const chatter of chatters.data) {
					const user = await UserModel.findOne<User>({ username: chatter.userName }).lean();
					const knownBots = await knownBotsModel.findOne<Bots>({ username: chatter.userName });
					const tbd = await chatter.getUser();
					// console.log( chatter.userName + ' : ' + tbd.creationDate);
	
					// console.log('chatter.userName:', chatter.userName);
					// console.log('knownBots.username:', knownBots?.username);
	
					if (knownBots && chatter.userName.toLowerCase() === knownBots.username.toLowerCase()) {
						// console.log('Skipping known bot:', chatter.userName);
						continue; // Skip giving coins to known bots
					}
					if (chatter.userName.toLowerCase() === 'opendevbot' || chatter.userName.toLowerCase() === 'streamelements' || chatter.userName.toLowerCase() === 'streamlabs') {
						// console.log('Skipping bot:', chatter.userName);
						continue; // Skip giving coins to specific usernames
					}
	
					if (!user) {
						const newUser = new UserModel({
							id: chatter.userId,
							username: chatter.userName,
							balance: 100,
						});
						// console.log('Added the user to the database: ' + newUser.balance);
						await newUser.save();
					} else {
						const updatedBalance = (user.balance || 0) + 100;
						await UserModel.findOneAndUpdate(
							{ username: chatter.userName },
							{ $set: { balance: updatedBalance } },
							{ new: true }
						);
						// console.log('Updated ' + chatter.userName + ' and gave them ' + updatedBalance + ' coins');
					}
				}
			}

			chunkIndex++;
			requestIndex++;

			if (chunkIndex === totalChunks) {
				// Reset the chunk index to 0 when all chunks have been processed
				chunkIndex = 0;
			}
		};

		setInterval(async () => {
			if (requestIndex < requestsPerInterval) {
				await processChatters();
			} else {
				requestIndex = 0; // Reset the request index when the maximum number of requests per interval is reached
			}
		}, intervalDurationPerRequest);

		if (text.startsWith('!')) {

			const args = text.slice(1).split(' ');
			const commandName = args.shift()?.toLowerCase();
			if (commandName === undefined) return;
			const command = commands[commandName];

			// if (!command && aliases.has(commandName)) {
			// 	const commandNameFromAlias = aliases.get(commandName)!.toLowerCase();
			// 	command = commands[commandNameFromAlias];
			// }

			if (command) {
				try {
					const currentTimestamp = Date.now();

					// Check if the command has a cooldown and if enough time has passed since the last execution
					if (command.cooldown && command.lastExecuted && currentTimestamp - command.lastExecuted < command.cooldown) {
						const remainingTime = (command.cooldown - (currentTimestamp - command.lastExecuted)) / 1000;
						return chatClient.say(channel, `@${user}, this command is on cooldown. Please wait ${remainingTime} seconds.`);
					}

					// Update the last executed timestamp of the command
					command.lastExecuted = currentTimestamp;
			
					command.execute(channel, user, args, text, msg);
				} catch (error: any) {
					console.error(error.message);
				}
			} else {
				if (text.includes('!join')) return;
				await chatClient.say(channel, 'Command not recognized, please try again');
			}
		}
		if (text.includes('overlay expert') && channel === '#canadiendragon') {
			chatClient.say(channel, `Hey ${msg.userInfo.displayName}, are you tired of spending hours configuring your stream's overlays and alerts? Check out Overlay Expert! With our platform, you can create stunning visuals for your streams without any OBS or streaming software knowledge. Don't waste time on technical details - focus on creating amazing content. Visit https://overlay.expert/support for support and start creating today! 🎨🎥, For support, see https://overlay.expert/support`);
		}
		const savedLurkMessage = await getSavedLurkMessage(msg.userInfo.displayName);
		if (savedLurkMessage && text.includes(`@${savedLurkMessage.displayName}`)) {
			chatClient.say(channel, `${msg.userInfo.displayName}, ${user}'s lurk message: ${savedLurkMessage.message}`);
		}
		if (text.includes('overlay designer') && channel === '#canadiendragon') {
			chatClient.say(channel, `Hey ${msg.userInfo.displayName}, do you have an eye for design and a passion for creating unique overlays? Check out https://overlay.expert/designers to learn how you can start selling your designs and making money on Overlay Expert. Don't miss this opportunity to turn your creativity into cash!`);
		}
		if (text.includes('wl') && channel === '#canadiendragon') {
			const amazon = 'https://www.amazon.ca/hz/wishlist/ls/354MPD0EKWXZN?ref_=wl_share';
			setTimeout(() => {
				chatClient.say(channel, `check out the Wish List here if you would like to help out the stream ${amazon}`);
			}, 1800000);
		}
		if (text.includes('Want to become famous?') && channel === '#canadiendragon') {
			const mods = msg.userInfo.isMod;
			if (msg.userInfo.userId === userID || mods) return;
			await userApiClient.moderation.deleteChatMessages(userID, userID, msg.id);
			await userApiClient.moderation.banUser(userID, userID, { user: msg.userInfo.userId, reason: 'Promoting selling followers to a broadcaster for twitch' });
			chatClient.say(channel, `${msg.userInfo.displayName} bugger off with your scams and frauds, you have been removed from this channel, have a good day`);
			const banEmbed = new EmbedBuilder()
				.setTitle('Automated Ban')
				.setAuthor({ name: `${msg.userInfo.displayName}` })
				.setColor('Red')
				.addFields([
					{
						name: 'User: ',
						value: `${msg.userInfo.displayName}`,
						inline: true
					},
					{
						name: 'Reason',
						value: 'Promoting of selling followers to a broadcaster for twitch',
						inline: true
					}
				])
				.setFooter({ text: `Someone just got BANNED from ${channel}'s channel` })
				.setTimestamp();
				
			await twitchActivity.send({ embeds: [banEmbed] });
		}
		setTimeout(async () => {
			await chatClient.say(channel, 'check out all my social media by using the !socials command, or check out the commands by using !help');
		}, 600000);
	};

	chatClient.onMessage(commandHandler);
}

function registerCommand(newCommand: Command) {
	commands.add(newCommand.name);
	if (newCommand.aliases) {
		newCommand.aliases.forEach((alias) => {
			commands.add(alias);
			// console.log(alias);
		});
	}
}

// holds the ChatClient
let chatClientInstance: ChatClient;
export async function getChatClient(): Promise<ChatClient> {
	if (!chatClientInstance) {
		const authProvider = await getAuthProvider();

		chatClientInstance = new ChatClient({ 
			authProvider, 
			channels: ['canadiendragon'], 
			logger: { minLevel: 'error' },
			authIntents: ['chat'],
			botLevel: 'none',
			isAlwaysMod: true,
		});
		await chatClientInstance.connect();
		console.log('The ChatClient has started');
	}
	
	return chatClientInstance;
}