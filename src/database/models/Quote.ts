import { createSqliteModel } from '../sqliteModel';

export interface IQuote {
	content: string;
}

export default createSqliteModel<IQuote>('Quote');