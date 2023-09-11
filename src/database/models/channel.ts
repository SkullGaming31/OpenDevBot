import { model, Schema } from 'mongoose';
interface IChannel extends Document {
	user_id: string;
	name: string;
	enabled: boolean;
}

const channelSchema = new Schema<IChannel>({
	user_id: {
		type: String,
		unique: true
	},
	name: {
		type: String,
		required: true
	},
	enabled: {
		type: Boolean,
		required: true,
		default: false
	},
});

const channelModel = model<IChannel>('channel', channelSchema);// channels
export default channelModel;