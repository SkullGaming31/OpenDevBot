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
	id: { type: String },
	username: { type: String },
	channelId: { type: String },
	roles: { type: String },
	balance: { type: Number, default: 0 },
	lastBegTime: { type: Date, default: null },
	challengedUser: { type: String },
	duelChallengeAccepted: { type: Boolean },
	inventory: { type: [String] },
	watchTime: { type: Number, default: 0 }
});

export const UserModel = model<IUser>('Users', userSchema);