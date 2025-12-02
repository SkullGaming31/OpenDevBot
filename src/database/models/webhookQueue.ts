import mongoose, { Schema, Document } from 'mongoose';

export type IWebhookQueue = Document & {
	webhookId: string;
	token: string;
	payload: unknown;
	status: 'pending' | 'processing' | 'sent' | 'failed';
	attempts: number;
	lastError?: string;
	createdAt: Date;
	updatedAt: Date;
};

const WebhookQueueSchema = new Schema<IWebhookQueue>({
	webhookId: { type: String, required: true, index: true },
	token: { type: String, required: true },
	payload: { type: Schema.Types.Mixed, required: true },
	status: { type: String, enum: ['pending', 'processing', 'sent', 'failed'], default: 'pending', index: true },
	attempts: { type: Number, default: 0 },
	lastError: { type: String, required: false }
}, { timestamps: true });

// Ensure model is registered only once (useful for tests/reloads)
const modelName = 'WebhookQueue';
export default mongoose.models[modelName] || mongoose.model<IWebhookQueue>(modelName, WebhookQueueSchema);
