import { Document, Model, Schema, model } from 'mongoose';

export interface ITwitchToken extends Document {
	user_id: string;
	login: string;
	access_token: string;
	refresh_token: string;
	scope: string[];
	expires_in: number;
	obtainmentTimestamp: number;
	broadcaster_type: string;
}

const tokenSchema = new Schema<ITwitchToken>({
	user_id: {
		type: String,
		unique: true,
		required: true,
		index: true
	},
	login: {
		type: String,
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
	broadcaster_type: {
		type: String,
		required: true
	}
});
// obtainmentTimestamp is saved in seconds same with expires_in

export const TokenModel: Model<ITwitchToken> = model<ITwitchToken>('usertokens', tokenSchema);