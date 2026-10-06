import { createSqliteModel } from '../sqliteModel';

export interface Counter {
	counterName: string;
	value: number;
}

export const CounterModel = createSqliteModel<Counter>('Counter', {
	defaults: { value: 0 },
	unique: [['counterName']],
});