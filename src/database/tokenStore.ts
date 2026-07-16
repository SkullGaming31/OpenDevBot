import { ITwitchToken, TokenModel } from './models/tokenModel';
import logger from '../util/logger';
import { openDevBotID } from '../util/constants';

export async function getUsernamesFromDatabase(): Promise<string[]> {
	try {
		// Exclude the bot's own token (openDevBotID) so we don't attempt to
		// join or display the bot's own channel in admin UIs.
		const tokens: ITwitchToken[] = await TokenModel.find({ user_id: { $ne: String(openDevBotID) } }, 'login');
		const usernames: string[] = tokens.map((token) => token.login).filter((v): v is string => Boolean(v && typeof v === 'string'));
		return usernames;
	} catch (error) {
		logger.error('Error fetching usernames from MongoDB:', error);
		throw error;
	}
}
