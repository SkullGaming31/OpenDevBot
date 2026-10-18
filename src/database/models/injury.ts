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

// Expired injuries are removed by application-layer cleanup in injuryCleanup.ts.
const InjuryModel = createSqliteModel<InjuryData>('Injury');

export { InjuryModel, InjuryData };