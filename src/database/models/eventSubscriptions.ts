import { createSqliteModel } from '../sqliteModel';

// Define MongoDB model
export interface SubscriptionInfo {
  subscriptionId: string;
  authUserId: string;
  type?: string;
  version?: string;
  condition?: Record<string, unknown>;
  status?: string;
  transport?: Record<string, unknown>;
}

export const SubscriptionModel = createSqliteModel<SubscriptionInfo>('eventSubscriptions', {
	timestamps: true,
	unique: [['subscriptionId', 'authUserId']],
});