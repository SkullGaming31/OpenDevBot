import { ITwitchToken, TokenModel } from './models/tokenModel';
import logger from '../util/logger';

export async function getUsernamesFromDatabase(): Promise<string[]> {
	try {
		const tokens: ITwitchToken[] = await TokenModel.find({}, 'login');
		const usernames: string[] = tokens.map((token) => token.login).filter((v): v is string => Boolean(v && typeof v === 'string'));
		return usernames;
	} catch (error) {
		logger.error('Error fetching usernames from MongoDB:', error);
		throw error;
	}
}
