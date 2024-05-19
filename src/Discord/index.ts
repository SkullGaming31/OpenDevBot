import { Client, GatewayIntentBits, Partials, TextChannel } from 'discord.js';

class DiscordBot {
	private client: Client;

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
	}

	public login(token: string) {
		return this.client.login(token);
	}
}

export default DiscordBot;