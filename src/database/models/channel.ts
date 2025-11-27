import { model, Schema, Document } from 'mongoose';

/**
 * Interface for a channel document in the database.
 */
interface IChannelDocument extends Document {
	/**
	 * The unique ID of the user who owns the channel.
	 */
	user_id: string;
	/**
	 * The name of the channel.
	 */
	name: string;
	/**
	 * Whether the channel is enabled or not.
	 */
	enabled: boolean;
	/**
	 * Whether channel-points redemption handling is enabled for this channel.
	 */
	channelPointsEnabled?: boolean;
}

const channelSchema = new Schema<IChannelDocument>({
	user_id: {
		type: String,
		unique: true,
		index: true, // Add an index to the user_id field
	},
	name: {
		type: String,
		required: true,
	},
	enabled: {
		type: Boolean,
		required: true,
		default: false,
	},
	// Whether the channel has enabled channel-points redemption handling
	channelPointsEnabled: {
		type: Boolean,
		required: false,
		default: false,
	},
});

const channelModel = model<IChannelDocument>('channel', channelSchema);

export default channelModel;