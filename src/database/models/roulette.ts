import { createSqliteModel } from '../sqliteModel';

interface ChamberState {
	userId: string;
	bullets: number;
}

const ChamberStateModel = createSqliteModel<ChamberState>('ChamberState', {
	defaults: { bullets: 1 },
	unique: [['userId']],
});

export default ChamberStateModel;