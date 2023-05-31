import { HelixChannel, HelixGame, HelixUser } from '@twurple/api/lib';
import { getUserApi } from '../api/userApiClient';

// export const TwitchActivityWebhookID = process.env.DEV_DISCORD_TWITCH_ACTIVITY_ID as string;
// export const TwitchActivityWebhookToken = process.env.DEV_DISCORD_TWITCH_ACTIVITY_TOKEN as string;
// export const PromoteWebhookID = process.env.DEV_DISCORD_PROMOTE_WEBHOOK_ID as string;
// export const PromoteWebhookToken = process.env.DEV_DISCORD_PROMOTE_WEBHOOK_TOKEN as string;

// export const commandUsageWebhookID = process.env.DISCORD_COMMAND_USAGE_ID as string;
// export const CommandUssageWebhookTOKEN = process.env.DISCORD_COMMAND_USAGE_TOKEN as string;

// export const userID: string = '31124455';
// export const openDevBotID: string = '659523613';

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

export let broadcasterInfo: ChannelInfo | undefined;
export let moderatorID: ChannelInfo | undefined;

export async function initializeConstants() {
	const userApiClient = await getUserApi();

	const helixBroadcaster: HelixChannel | null = await userApiClient.channels.getChannelInfoById(userID);
	const helixModerator: HelixChannel | null = await userApiClient.channels.getChannelInfoById(openDevBotID);
  
	if (helixBroadcaster === null || helixModerator === null) {
		throw new Error('Failed to retrieve broadcaster info or moderator ID.');
	}

	broadcasterInfo = {
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
	};

	moderatorID = {
		delay: helixModerator.delay,
		displayName: helixModerator.displayName,
		id: helixModerator.id,
		name: helixModerator.displayName,
		gameId: helixModerator.gameId,
		gameName: helixModerator.gameName,
		language: helixModerator.language,
		getBroadcaster: helixBroadcaster.getBroadcaster,
		getGame: helixBroadcaster.getGame,
		tags: helixModerator.tags,
		title: helixModerator.title
	};
}

// Call the function to initialize the constants
initializeConstants().catch(error => {
	console.error('Error initializing constants:', error);
});

// Export other constants
export const TwitchActivityWebhookID = process.env.DEV_DISCORD_TWITCH_ACTIVITY_ID as string;
export const TwitchActivityWebhookToken = process.env.DEV_DISCORD_TWITCH_ACTIVITY_TOKEN as string;
export const PromoteWebhookID = process.env.DEV_DISCORD_PROMOTE_WEBHOOK_ID as string;
export const PromoteWebhookToken = process.env.DEV_DISCORD_PROMOTE_WEBHOOK_TOKEN as string;
export const commandUsageWebhookID = process.env.DISCORD_COMMAND_USAGE_ID as string;
export const CommandUssageWebhookTOKEN = process.env.DISCORD_COMMAND_USAGE_TOKEN as string;
export const userID: string = '31124455';
export const openDevBotID: string = '659523613';
