import { Client, GatewayIntentBits, Partials } from 'discord.js';

export const client = new Client({ 
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent, 
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildWebhooks
	],
	partials: [
		Partials.Channel,
		Partials.GuildMember,
		Partials.GuildScheduledEvent,
		Partials.Message,
		Partials.Reaction,
		Partials.ThreadMember,
		Partials.User
	],
	presence: { status: 'online' },
	allowedMentions: { parse: ['everyone', 'roles', 'users'], repliedUser: true }
});