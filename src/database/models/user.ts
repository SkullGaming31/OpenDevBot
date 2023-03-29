import { Schema, model } from 'mongoose';

interface IUser {
	twitchId: string;
	access_token: string;
	refresh_token: string;
	scopes: string[];
	expiresIn: string;
	obtainmentTimestamp: string;
}

const userScema = new Schema<IUser>({
	twitchId: {
		type: String,
		unique: true
	},
	access_token: {
		type: String,
		required: true
	},
	refresh_token: {
		type: String,
		require: true
	},
	scopes: {
		type: [String],
		required: true
	},
	expiresIn: {
		type: String,
		required: true
	},
	obtainmentTimestamp: {
		type: String,
		required: false
	},
});

const userModel = model<IUser>('users', userScema);
export default userModel;