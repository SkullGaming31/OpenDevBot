import { createSqliteModel } from '../sqliteModel';

export type IWebhookQueue = {
	webhookId: string;
	token: string;
	payload: unknown;
	event?: string;
	dryRun?: boolean;
	status: 'pending' | 'processing' | 'sent' | 'failed';
	attempts: number;
	lastError?: string;
	createdAt: Date;
	updatedAt: Date;
};

export default createSqliteModel<IWebhookQueue>('WebhookQueue', {
	defaults: { status: 'pending', attempts: 0 },
	timestamps: true,
});
