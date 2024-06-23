import { model, Schema, Document } from 'mongoose';

// Define MongoDB model
export interface SubscriptionInfo extends Document {
  subscriptionId: string;
  authUserId: string;
}

const subscriptionInfoSchema = new Schema<SubscriptionInfo>({
	subscriptionId: { type: String, required: true, unique: true },
	authUserId: { type: String, required: true },
});

export const SubscriptionModel = model<SubscriptionInfo>('eventSubscriptions', subscriptionInfoSchema);