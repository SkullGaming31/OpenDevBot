import { model, Schema, Document } from 'mongoose';

// Define MongoDB model
export interface SubscriptionInfo extends Document {
  subscriptionId: string;
  authUserId: string;
}

const subscriptionInfoSchema = new Schema<SubscriptionInfo>({
	subscriptionId: { type: String, required: true },
	authUserId: { type: String, required: true },
});

// Create a compound unique index
subscriptionInfoSchema.index({ subscriptionId: 1, authUserId: 1 }, { unique: true });

export const SubscriptionModel = model<SubscriptionInfo>('eventSubscriptions', subscriptionInfoSchema);