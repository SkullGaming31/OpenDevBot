import { Client, GatewayIntentBits, Partials, TextChannel } from 'discord.js';

class DiscordBot {
	private client: Client;

	/**
	 * @description
	 * Initialize the Discord bot and prepare it to login
	 *
	 * The bot is setup to listen to the following events:
	 * - ready: Prints a message when the bot is ready
	 * - error: Prints an error message if something goes wrong when trying to login
	 * - warn: Prints a warning message when the bot is started
	 * - shardDisconnect: Prints an error message if a shard disconnects
	 *
	 * The bot is also setup to listen to the following intents:
	 * - Guilds: Get information about guilds the bot is in
	 * - GuildMessages: Get messages in guilds the bot is in
	 * - MessageContent: Get the content of messages in guilds the bot is in
	 * - GuildMembers: Get information about members in guilds the bot is in
	 *
	 * The bot is also setup to listen to the following partials:
	 * - Channel: Get information about channels in guilds the bot is in
	 * - GuildMember: Get information about members in guilds the bot is in
	 * - GuildScheduledEvent: Get information about guild scheduled events in guilds the bot is in
	 * - Message: Get information about messages in guilds the bot is in
	 * - Reaction: Get information about reactions on messages in guilds the bot is in
	 * - ThreadMember: Get information about thread members in guilds the bot is in
	 * - User: Get information about users in guilds the bot is in
	 */
	constructor() {
		this.client = new Client({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildMembers
			],
			partials: [
				Partials.Channel,
				Partials.GuildMember,
				Partials.GuildScheduledEvent,
				Partials.Message,
				Partials.Reaction,
				Partials.ThreadMember,
				Partials.User
			]
		});

		this.client.on('ready', () => { console.log(`Logged in as ${this.client.user?.tag}!`); });

		this.client.on('error', (error: Error) => { console.error(`Something happen when trying to login: ${error}`); });
		this.client.on('warn', (warn: string) => { console.info('Discord Warning', warn); });
		this.client.on('shardDisconnect', (t) => { console.error('Shard Disconnect: ', t); });
		this.client.on('shardError', (t: Error) => { console.error('Shard Error: ', t); });
	}

	/**
	 * Login to the Discord Bot.
	 * @param token The token to use when logging in.
	 * @returns A Promise that resolves when the bot is logged in.
	 */
	public login(token: string) { return this.client.login(token); }
}

export default DiscordBot;