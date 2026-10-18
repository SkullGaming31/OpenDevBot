import { createSqliteModel } from '../sqliteModel';

export interface LurkMessage {
	id: string;
	displayName: string;
	displayNameLower: string;
	message: string;
}

export const LurkMessageModel = createSqliteModel<LurkMessage>('LurkMessage', {
	defaults: { message: 'No Afk message set' },
	unique: [['id']],
});