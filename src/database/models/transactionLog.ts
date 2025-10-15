import { Schema, model, Document } from 'mongoose';

export interface ITransactionLog extends Document {
    type: 'deposit' | 'withdraw' | 'transfer' | 'purchase';
    from?: string;
    to?: string;
    amount: number;
    meta?: Record<string, unknown>;
    createdAt: Date;
}

const transactionLogSchema = new Schema<ITransactionLog>({
    type: { type: String, required: true },
    from: { type: String },
    to: { type: String },
    amount: { type: Number, required: true },
    meta: { type: Schema.Types.Mixed },
}, { timestamps: true });

const TransactionLog = model<ITransactionLog>('TransactionLog', transactionLogSchema);
export default TransactionLog;
