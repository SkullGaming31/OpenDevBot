import { Document, Schema, model } from 'mongoose';

export interface IUser extends Document {
    id: string;
    username: string;
    channelId: string;
    roles: string;
    balance?: number;
    lastBegTime?: Date;
    challengedUser?: string;
    duelChallengeAccepted?: boolean;
    inventory?: string[];
    watchTime: number;
}

const userSchema = new Schema<IUser>({
	id: { type: String, required: true, unique: true }, // Ensures each id is unique
	username: { type: String, required: true },
	channelId: { type: String, required: true, unique: true }, // Ensures each channelId is unique
	roles: { type: String, required: true },
	balance: { type: Number, default: 0 },
	lastBegTime: { type: Date, default: new Date(0) },
	challengedUser: { type: String },
	duelChallengeAccepted: { type: Boolean },
	inventory: { type: [String] },
	watchTime: { type: Number, default: 0 }
});

// Create an index on the channelId field
userSchema.index({ channelId: 1 }, { unique: true });

export const UserModel = model<IUser>('Users', userSchema);