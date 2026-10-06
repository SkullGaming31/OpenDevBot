import { createSqliteModel } from '../sqliteModel';

export interface Bots {
	id: string;
	username: string;
	addedBy?: string;
	addedFromChannel?: string;
	addedAt?: Date;
}

export const knownBotsModel = createSqliteModel<Bots>('bots', {
	defaults: { addedAt: new Date() },
	unique: [['username']],
});

export default knownBotsModel;