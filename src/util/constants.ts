import { HelixChannel, HelixGame, HelixUser, UserIdResolvable } from '@twurple/api/lib';
import { getUserApi } from '../api/userApiClient';
import { TokenModel, ITwitchToken } from '../database/models/tokenModel';

interface ChannelInfo {
  delay: number;
  displayName: string;
  gameId: string;
  gameName: string;
  id: string;
  language: string;
  name: string;
  tags: string[];
  title: string;
  getBroadcaster(): Promise<HelixUser>;
  getGame(): Promise<HelixGame | null>;
}

export const broadcasterInfo: ChannelInfo[] = [];
export const moderatorIDs: ChannelInfo[] = [];

export async function initializeConstants() {
	const userApiClient = await getUserApi();

	try {
		// Exclude the entry with user_id '659523613'
		const userTokens = await TokenModel.find<ITwitchToken>({ user_id: { $ne: '659523613' } }).lean();

		if (userTokens.length === 0) {
			throw new Error('No Twitch tokens found in the database');
		}

		for (const userToken of userTokens) {
			const helixBroadcaster: HelixChannel | null = await userApiClient.channels.getChannelInfoById(userToken.user_id);
			// if (process.env.Enviroment === 'dev' || process.env.Enviroment === 'debug') {
			// 	console.log(`Username:${helixBroadcaster?.displayName} : ID:${helixBroadcaster?.id}`);
			// }
			const helixModerator: HelixChannel | null = await userApiClient.channels.getChannelInfoById(userToken.user_id); 
      
			if (helixBroadcaster === null || helixModerator === null) {
				throw new Error(`Failed to retrieve info for user ${userToken.user_id}`);
			}

			broadcasterInfo.push({
				delay: helixBroadcaster.delay,
				displayName: helixBroadcaster.displayName,
				id: helixBroadcaster.id,
				name: helixBroadcaster.displayName,
				gameId: helixBroadcaster.gameId,
				gameName: helixBroadcaster.gameName,
				language: helixBroadcaster.language,
				getBroadcaster: helixBroadcaster.getBroadcaster,
				getGame: helixBroadcaster.getGame,
				tags: helixBroadcaster.tags,
				title: helixBroadcaster.title
			});

			moderatorIDs.push({
				delay: helixModerator.delay,
				displayName: helixModerator.displayName,
				id: helixModerator.id,
				name: helixModerator.displayName,
				gameId: helixModerator.gameId,
				gameName: helixModerator.gameName,
				language: helixModerator.language,
				getBroadcaster: helixModerator.getBroadcaster,
				getGame: helixModerator.getGame,
				tags: helixModerator.tags,
				title: helixModerator.title
			});
		}
	} catch (error) {
		console.error('Error initializing constants:', error);
		throw error; // Re-throw the error to propagate it further if needed
	}
}

// Call the function to initialize the constants
initializeConstants().catch((error: Error) => { console.error('Error initializing constants:', error.name + error.message + error.stack); });

// Export other constants
export const TwitchActivityWebhookID = process.env.DEV_DISCORD_TWITCH_ACTIVITY_ID as string;
export const TwitchActivityWebhookToken = process.env.DEV_DISCORD_TWITCH_ACTIVITY_TOKEN as string;
export const PromoteWebhookID = process.env.DEV_DISCORD_PROMOTE_WEBHOOK_ID as string;
export const PromoteWebhookToken = process.env.DEV_DISCORD_PROMOTE_WEBHOOK_TOKEN as string;
export const commandUsageWebhookID = process.env.DISCORD_COMMAND_USAGE_ID as string;
export const CommandUssageWebhookTOKEN = process.env.DISCORD_COMMAND_USAGE_TOKEN as string;
export const openDevBotID: UserIdResolvable = '659523613';