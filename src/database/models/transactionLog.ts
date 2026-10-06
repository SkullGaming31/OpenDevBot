import { createSqliteModel } from '../sqliteModel';

export interface ITransactionLog {
    type: 'deposit' | 'withdraw' | 'transfer' | 'purchase';
    from?: string;
    to?: string;
    amount: number;
    meta?: Record<string, unknown>;
    createdAt: Date;
}

const TransactionLog = createSqliteModel<ITransactionLog>('TransactionLog', { timestamps: true });
export default TransactionLog;
