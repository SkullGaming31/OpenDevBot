import { createSqliteModel } from '../sqliteModel';

export interface IUser {
	id: string;
	username: string;
	channelId: string;
	roles: string;
	balance?: number;
	lastBegTime?: Date | null;
	challengedUser?: string;
	duelChallengeAccepted?: boolean;
	inventory?: string[];
	watchTime: number;
}

export const UserModel = createSqliteModel<IUser>('Users', {
	defaults: { balance: 0, lastBegTime: null, watchTime: 0 },
});