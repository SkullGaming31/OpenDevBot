import mongoose, { Document, Schema, model } from 'mongoose';

export interface FollowMessageDoc extends Document {
	broadcasterName?: string;
	name: string;
	gameId?: string;
	messages: string[];
}

const followMessageSchema = new Schema<FollowMessageDoc>({
	broadcasterName: { type: String, required: false },
	name: { type: String, required: true },
	gameId: { type: String, required: false },
	messages: { type: [String], required: true },
});

const FollowMessage = model<FollowMessageDoc>('FollowMessage', followMessageSchema);

export default FollowMessage;