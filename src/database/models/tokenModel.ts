import { createSqliteModel } from '../sqliteModel';

export interface ITwitchToken {
	user_id: string;
	login: string;
	access_token: string;
	refresh_token: string;
	scope: string[];
	expires_in: number;
	obtainmentTimestamp: number;
	broadcaster_type: string;
}

// obtainmentTimestamp is saved in seconds same with expires_in

export const TokenModel = createSqliteModel<ITwitchToken>('usertokens', {
	unique: [['user_id']],
});