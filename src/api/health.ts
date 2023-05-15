import axios, { AxiosResponse } from 'axios';
import { Client as DiscordClient, GatewayIntentBits } from 'discord.js';
import { Request, RequestHandler, Response } from 'express';
import mongoose, { Connection } from 'mongoose';

const getBearerToken = async (): Promise<string> => {
	const clientId = process.env.TWITCH_CLIENT_ID as string;
	const clientSecret = process.env.TWITCH_CLIENT_SECRET as string;
	const tokenUrl = `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`;

	const response: AxiosResponse = await axios.post(tokenUrl);

	if (response.status !== 200) {
		throw new Error('Failed to get Twitch API token');
	}

	return response.data.access_token;
};

const healthListener: RequestHandler = async (_req: Request, res: Response) => {
	let mongoConnection: Connection | null = null;
	let discordClient: DiscordClient | null = null;
	const mongoURI = process.env.MONGO_URI as string;

	try {
		// Check MongoDB connection
		mongoConnection = mongoose.connection;
		await mongoConnection.db.command({ ping: 1 });
		res.write('MongoDB: OK\n');

		// Check Twitch API
		const token = await getBearerToken();
		const twitchResponse: AxiosResponse = await axios.get('https://api.twitch.tv/helix/users?login=canadiendragon', {
			headers: {
				'Client-ID': process.env.TWITCH_CLIENT_ID as string,
				Authorization: `Bearer ${token}`,
			},
		});
		if (twitchResponse.status === 200) {
			res.write('Twitch API: OK\n');
		} else {
			res.write('Twitch API: DOWN\n');
		}

		// Check Discord API
		discordClient = new DiscordClient({ intents: [GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildWebhooks] });
		await discordClient.login(process.env.DEV_DISCORD_BOT_TOKEN as string);
		if (discordClient.user) {
			res.write('Discord API: OK\n');
		} else {
			res.write('Discord API: DOWN\n');
		}

		res.status(200).send();
	} catch (err) {
		console.error(err);
		res.sendStatus(500);
	} finally {
		if (discordClient) {
			discordClient.destroy();
		}
	}
};


export default healthListener;
