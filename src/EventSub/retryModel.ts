import { createSqliteModel } from '../database/sqliteModel';

export interface IRetryRecord {
    subscriptionId: string;
    authUserId: string;
    attempts: number;
    lastError?: string;
    nextRetryAt?: Date | null;
    status: 'pending' | 'succeeded' | 'failed';
}

export const RetryModel = createSqliteModel<IRetryRecord>('eventSubscriptionRetries', {
	defaults: { attempts: 0, nextRetryAt: null, status: 'pending' },
	unique: [['subscriptionId', 'authUserId']],
});
