import mongoose, { Document, Schema, model } from 'mongoose';

export interface User extends Document {
  _id: mongoose.Types.ObjectId;
  id: string;
  username: string;
  balance: number;
  lastBegTime: Date;
  challengedUser: string;
  duelChallengeAccepted: boolean;
  inventory: string[]
}

const userSchema = new Schema<User>({
	_id: { type: Schema.Types.ObjectId, default: new mongoose.Types.ObjectId() },
	id: { type: String, required: true, unique: true },
	username: { type: String, required: true },
	balance: { type: Number, default: 0 },
	lastBegTime: { type: Date, default: new Date(0) },
	challengedUser: { type: String },
	duelChallengeAccepted: { type: Boolean },
	inventory: { type: [String], }// Item Storage
});

export const UserModel = model<User>('Users', userSchema);

export default UserModel;