import { createSqliteModel } from '../sqliteModel';

interface Injury {
	severity: string;
	duration: number;
	description: string;
	timestamp: number;
}

interface InjuryData {
	participantName: string;
	injuries: Injury[];
}

// Note: MongoDB TTL indexes cannot be created directly on array subdocument fields.
// Cleanup is performed at the application layer
// (see `src/index.ts` -> deleteExpiredInjuries) which uses $pull with a cutoff value.
const InjuryModel = createSqliteModel<InjuryData>('Injury');

export { InjuryModel, InjuryData };