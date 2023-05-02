import { Schema, model } from 'mongoose';

export interface User {
  id: string;
  username: string;
  balance: number;
  lastBegTime: Date;
  challengedUser: string;
  duelChallengeAccepted: boolean;
}

const userSchema = new Schema<User>({
	id: { type: String, required: true, unique: true },
	username: { type: String, required: true },
	balance: { type: Number, default: 0 },
	lastBegTime: { type: Date, default: new Date(0) },
	challengedUser: { type: String },
	duelChallengeAccepted: { type: Boolean }
});

export const UserModel = model<User>('Users', userSchema);

export default UserModel;