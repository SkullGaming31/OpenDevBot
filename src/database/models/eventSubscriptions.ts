import { model, Schema, Document } from 'mongoose';

// Define MongoDB model
export interface SubscriptionInfo extends Document {
  subscriptionId: string;
  authUserId: string;
  type?: string;
  version?: string;
  condition?: Record<string, unknown>;
  status?: string;
  transport?: Record<string, unknown>;
}

const subscriptionInfoSchema = new Schema<SubscriptionInfo>({
	subscriptionId: { type: String, required: true },
	authUserId: { type: String, required: true },
	type: { type: String },
	version: { type: String },
	condition: { type: Schema.Types.Mixed },
	status: { type: String },
	transport: { type: Schema.Types.Mixed },
}, { timestamps: true });

// Create a compound unique index
subscriptionInfoSchema.index({ subscriptionId: 1, authUserId: 1 }, { unique: true });

export const SubscriptionModel = model<SubscriptionInfo>('eventSubscriptions', subscriptionInfoSchema);