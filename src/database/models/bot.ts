import { Schema, model } from 'mongoose';

interface Bot {
	name: string;
	access_token: string;
	refresh_token: string;
	scopes: [string];
	expiresIn: string;
	obtainmentTimestamp: string;
}

const botScema = new Schema<Bot>({
	name: {
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

const botModel = model<Bot>('user', botScema);
export default botModel;