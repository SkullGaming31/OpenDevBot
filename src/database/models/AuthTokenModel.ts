import { Schema, model, Document } from 'mongoose';

interface IToken extends Document {
	userId: string;
	access_token: string;
	refresh_token: string;
	scopes: [string];
	expiresIn: string;
	obtainmentTimestamp: string;
}

const botSchema = new Schema<IToken>({
	userId: {
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

const botModel = model<IToken>('user', botSchema);
export default botModel;