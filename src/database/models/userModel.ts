import { Document, Schema, model } from 'mongoose';

export interface User extends Document {
	id: string;
	username: string;
	roles: string;
	balance?: number;
	lastBegTime?: Date;
	challengedUser?: string;
	duelChallengeAccepted?: boolean;
	inventory?: string[];
	watchTime: number;
}

const userSchema = new Schema<User>({
	id: { type: String, unique: true },
	username: { type: String },
	roles: { type: String, required: true },
	balance: { type: Number, default: 0 },
	lastBegTime: { type: Date, default: new Date(0) },
	challengedUser: { type: String },
	duelChallengeAccepted: { type: Boolean },
	inventory: { type: [String] }, // Item Storage
	watchTime: { type: Number, default: 0 }
});

export const UserModel = model<User>('Users', userSchema);