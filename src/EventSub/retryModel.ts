import { model, Schema, Document } from 'mongoose';

export interface IRetryRecord extends Document {
    subscriptionId: string;
    authUserId: string;
    attempts: number;
    lastError?: string;
    nextRetryAt?: Date | null;
    status: 'pending' | 'succeeded' | 'failed';
}

const RetrySchema = new Schema<IRetryRecord>({
	subscriptionId: { type: String, required: true },
	authUserId: { type: String, required: true },
	attempts: { type: Number, required: true, default: 0 },
	lastError: { type: String },
	nextRetryAt: { type: Date, default: null },
	status: { type: String, enum: ['pending', 'succeeded', 'failed'], default: 'pending' },
});

RetrySchema.index({ subscriptionId: 1, authUserId: 1 }, { unique: true });

export const RetryModel = model<IRetryRecord>('eventSubscriptionRetries', RetrySchema);
