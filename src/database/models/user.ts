import { Document, Schema, model } from 'mongoose';

export interface IUser extends Document {
	twitchId: string;
	access_token: string;
	refresh_token: string;
	scope: string[];
	expires_in: number;
	obtainmentTimestamp: number;
}

const tokenSchema = new Schema<IUser>({
	twitchId: {
		type: String,
		unique: true,
		required: true
	},
	access_token: {
		type: String,
		required: true
	},
	refresh_token: {
		type: String,
		required: true
	},
	scope: {
		type: [String],
		required: true
	},
	expires_in: {
		type: Number,
		required: true
	},
	obtainmentTimestamp: {
		type: Number,
		required: true
	},
});
// obtainmentTimestamp is saved in seconds same with expires_in

const tokenModel = model<IUser>('token', tokenSchema);

export default tokenModel;