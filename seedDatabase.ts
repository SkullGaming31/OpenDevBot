import { config } from 'dotenv';
config();
import mongoose from 'mongoose';
import FollowMessage, { FollowMessageDoc } from './src/database/models/followMessages';

const followerRandomMessages = [
	{
		name: 'Dark and Darker',
		gameId: '2009321156',
		followerMessages: [
			'Welcome to the darkness, ${e.userDisplayName}! May your journey through the dungeons be filled with epic loot and glorious victories!',
			'Thanks for following, ${e.userDisplayName}! Prepare yourself for the darkest dungeons and fiercest battles!',
			'Hail, ${e.userDisplayName}! Your bravery in following brings us one step closer to conquering the dark!',
			'Welcome to the adventurers\' guild, ${e.userDisplayName}! May your path be lit by the treasures you find!',
			'Thanks for following, ${e.userDisplayName}! Together, we shall explore the depths and claim our fortune!',
			'Welcome, ${e.userDisplayName}, to the realm of Dark and Darker! May your sword stay sharp and your spells powerful!',
			'Thanks for joining us, ${e.userDisplayName}! The dungeons await your courage and skill!',
			'Welcome aboard, ${e.userDisplayName}! May your journey through the darkness be filled with light and loot!',
			'Hail, ${e.userDisplayName}! Your presence strengthens our quest to conquer the shadows!',
			'Thanks for following, ${e.userDisplayName}! Together, we shall delve into the darkness and emerge victorious!'
		]
	},
];

async function seedFollowerMessages() {
	const mongoUri = process.env.Enviroment === 'prod' ? process.env.MONGO_URI as string : process.env.MONGO_URI_DEV as string;
	await mongoose.connect(mongoUri, { autoIndex: true });

	const existingEntries = await FollowMessage.find({});
	if (existingEntries.length > 0) {
		console.log('Deleting Existing Data');
		await FollowMessage.deleteMany({});
		console.log('Successfully Deleted all Data');
	}


	// Adjust the mapping to ensure all properties align with FollowMessageDoc
	const insertDocuments: FollowMessageDoc[] = followerRandomMessages.map(game => ({
		gameId: game.gameId !== undefined ? game.gameId : '',
		name: game.name,
		messages: game.followerMessages,
	})) as FollowMessageDoc[];

	await FollowMessage.insertMany(insertDocuments);

	console.log('Database seeded successfully!');
	await mongoose.disconnect();
}

seedFollowerMessages().catch(err => { console.error('Error seeding the database:', err); });