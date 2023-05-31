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

const checkMongoDBConnection = async (): Promise<boolean> => {
	const mongoConnection: Connection = mongoose.connection;
	try {
		await mongoConnection.db.command({ ping: 1 });
		return true;
	} catch (error) {
		return false;
	}
};

const checkTwitchAPI = async (): Promise<boolean> => {
	const token = await getBearerToken();
	const twitchResponse: AxiosResponse = await axios.get(
		'https://api.twitch.tv/helix/users?login=canadiendragon',
		{
			headers: {
				'Client-ID': process.env.TWITCH_CLIENT_ID as string,
				Authorization: `Bearer ${token}`,
			},
		}
	);

	return twitchResponse.status === 200;
};

const checkDiscordAPI = async (): Promise<boolean> => {
	const discordClient: DiscordClient = new DiscordClient({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.GuildMembers,
			GatewayIntentBits.GuildWebhooks,
		],
	});

	try {
		await discordClient.login(process.env.DEV_DISCORD_BOT_TOKEN as string);

		return !!discordClient.user;
	} catch (error) {
		return false;
	} finally {
		discordClient.destroy();
	}
};

const healthListener: RequestHandler = async (_req: Request, res: Response) => {
	try {
		const isMongoDBConnected = await checkMongoDBConnection();
		const isTwitchAPIUp = await checkTwitchAPI();
		const isDiscordAPIUp = await checkDiscordAPI();

		res.json({
			mongodb: isMongoDBConnected ? 'OK' : 'DOWN',
			twitchAPI: isTwitchAPIUp ? 'OK' : 'DOWN',
			discordAPI: isDiscordAPIUp ? 'OK' : 'DOWN',
		});
	} catch (err) {
		console.error(err);
		res.sendStatus(500);
	}
};
export default healthListener;