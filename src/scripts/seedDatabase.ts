import { config } from 'dotenv';
config();
import mongoose from 'mongoose';
import FollowMessage, { FollowMessageDoc } from '../database/models/followMessages';
import logger from '../util/logger';

const followerRandomMessages = [
	{
		name: 'ARC Raiders',
		gameId: '464339927',
		followerMessages: [
			'New Raider joined the fight. Welcome ${username} to the ARC zone',
			'A new scavenger enters the wasteland. Thanks for the follow',
			'Backup has arrived. Welcome, Raider.',
			'Another survivor ready to take on the ARCs',
			'New follower detected on radar. Gear up',
			'A fresh Raider drops into the field. Welcome in',
			'One more ally against the machines. Thanks for following',
			'New extraction candidate secured. Welcome',
			'A new name added to the Raider roster',
			'The ARCs wont know what hit them. Welcome, Raider',
			'New follower detected… scanning… wait—are you an ARC in disguise? If not, welcome, Raider',
			'Motion alert at the perimeter. Could be friendly… could be an ARC pretending to follow. Welcome, Stay where we can see you'
		]
	},
];

/**
 * Seeds the FollowMessage model with the messages from followerRandomMessages.
 *
 * Connects to the database, deletes any existing data if in dev/debug mode,
 * and inserts the messages.
 *
 * Also seeds the user token for the bot.
 *
 * @returns {Promise<void>}
 */
async function seedFollowerMessages(): Promise<void> {
	const mongoUri = process.env.Enviroment === 'prod' ? process.env.MONGO_URI as string : process.env.DOCKER_URI as string;
	await mongoose.connect(mongoUri, { autoIndex: true });

	if (process.env.Enviroment === 'dev' || process.env.Enviroment === 'debug') {
		const existingEntries = await FollowMessage.find({});
		if (existingEntries.length > 0) {
			logger.info('Deleting Existing Data');
			await FollowMessage.deleteMany({});
			logger.info('Successfully Deleted all Data');
		}
	}


	// Adjust the mapping to ensure all properties align with FollowMessageDoc
	const insertDocuments: FollowMessageDoc[] = followerRandomMessages.map(game => ({
		gameId: game.gameId !== undefined ? game.gameId : '',
		name: game.name,
		messages: game.followerMessages,
	})) as FollowMessageDoc[];

	await FollowMessage.insertMany(insertDocuments);

	logger.info('Database seeded successfully!');
	await mongoose.disconnect();
}

seedFollowerMessages().catch((err: unknown) => {
	if (err instanceof Error) {
		logger.error('Error seeding the database: ', err);
	}
});