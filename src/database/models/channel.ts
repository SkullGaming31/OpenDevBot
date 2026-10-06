import { createSqliteModel } from '../sqliteModel';

/**
 * Interface for a channel document in the database.
 */
interface IChannelDocument {
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

const channelModel = createSqliteModel<IChannelDocument>('channel', {
	defaults: { enabled: false, channelPointsEnabled: false },
	unique: [['user_id']],
});

export default channelModel;