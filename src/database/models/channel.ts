import { model, Schema } from 'mongoose';
interface IChannel {
    twitchId: string;
    name: string;
    enabled: boolean;
}

const channelSchema = new Schema<IChannel>({
	twitchId: {
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