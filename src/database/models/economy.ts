import { Document, model, Schema } from 'mongoose';
// import db from '../index';

interface Economy extends Document {
    twitchId: string;
    skulls: number;
}

const economyScema = new Schema<Economy>({
	twitchId: {
		type: String,
		unique: true
	},
	skulls: {
		type: Number,
		required: true,
		default: 0
	}
});

const economyModel = model<Economy>('economy', economyScema);// users
export default economyModel;