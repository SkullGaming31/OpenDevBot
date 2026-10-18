import { createSqliteModel } from '../sqliteModel';

export interface FollowMessageDoc {
	broadcasterName?: string;
	name: string;
	gameId?: string;
	messages: string[];
}

const FollowMessage = createSqliteModel<FollowMessageDoc>('FollowMessage');

export default FollowMessage;