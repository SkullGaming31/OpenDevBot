import { ChatClient } from '@twurple/chat';
import { PrivateMessage } from '@twurple/chat/lib';

import { EmbedBuilder, WebhookClient } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { getUserApi } from './api/userApiClient';
import { getAuthProvider } from './auth/authProvider';
import { LurkMessageModel } from './database/models/LurkModel';
import { Command } from './interfaces/apiInterfaces';
import { TwitchActivityWebhookID, TwitchActivityWebhookToken, userID } from './util/constants';

// Function to generate the list of available commands
// function generateCommandList(): string { return 'Available commands: !' + Array.from(commands).join(', !'); }

function setMinuteInterval(callback: () => void, intervalMinutes: number): NodeJS.Timeout {
	const intervalMs = intervalMinutes * 60 * 1000;
	return setInterval(callback, intervalMs);
}
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
	const lurkingUsers: string[] = [];
	const userApiClient = await getUserApi();
	const twitchActivity = new WebhookClient({ id: TwitchActivityWebhookID, token: TwitchActivityWebhookToken });
	const getSavedLurkMessage = async (displayName: string) => { return LurkMessageModel.findOne({ displayName }); };

	// Handle commands
	const commandHandler = async (channel: string, user: string, text: string, msg: PrivateMessage) => {
		if (text.startsWith('!')) {
			console.log(`${msg.userInfo.displayName} Said: ${text} in ${channel}`);

			// const broadcasterID = await userApiClient.channels.getChannelInfoById(userID);
			// if (broadcasterID?.id === undefined) return;
			// const canadiendragon = await userApiClient.channels.getChannelInfoById(userID);

			const args = text.slice(1).split(' ');
			const commandName = args.shift()?.toLowerCase();
			if (commandName === undefined) return;
			const command = commands[commandName];

			// if (!command && aliases.has(commandName)) {
			// 	const commandNameFromAlias = aliases.get(commandName)!.toLowerCase();
			// 	command = commands[commandNameFromAlias];
			// }

			if (command) {
				command.execute(channel, user, args, text, msg);
			} else {
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
// Function to remove commands from the set
// function removeCommands(commandsToRemove: string | string[]): void {
// 	if (!Array.isArray(commandsToRemove)) {
// 		commandsToRemove = [commandsToRemove]; // convert single command to array
// 	}
// 	commandsToRemove.forEach((command) => {
// 		// Check if the command is in the set before deleting it
// 		if (commands.has(command)) {
// 			commands.delete(command);
// 		} else {
// 			console.warn(`Command "${command}" not found`);
// 		}
// 	});
// }

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
		chatClientInstance.connect();
		console.log('The ChatClient has started');
	}
	
	return chatClientInstance;
}