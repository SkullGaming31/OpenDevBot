import { config } from 'dotenv';
config();
import mongoose from 'mongoose';
import FollowMessage, { FollowMessageDoc } from './src/database/models/followMessages';
import { ITwitchToken, TokenModel } from './src/database/models/tokenModel';

const followerRandomMessages = [
	{
		name: 'Conan Exiles',
		gameId: '493551',
		followerMessages: [
			'We\'ve been waiting for a worthy adventurer like you, @${e.userDisplayName}. Welcome to this perfect place for building friendships and having fun!', // conan exiles,
			'Survival is in our blood, and we\'re thrilled to have you join us, @${e.userDisplayName}. Welcome!', // conan exiles,
			'The gods themselves will be pleased with your arrival, @${e.userDisplayName}. Welcome to our community!',// conan exiles,
			'The sands of our chat will drink the blood of our enemies together, @${e.userDisplayName}. Welcome!', // conan exiles
			'You are an exile no more, @${e.userDisplayName}. Welcome to the lands of adventure!',// conan exiles
		]
	},
	{
		name: 'Science & Technolgy',
		gameId: '509670',
		followerMessages: [
			'Welcome to the world of coding, @${e.userDisplayName}. Let\'s create amazing things with the power of code!',
			'Greetings, @${e.userDisplayName}. In coding, we turn ideas into reality through the art of programming. Welcome to the journey!',
			'Step into the realm of coding, @${e.userDisplayName}. Here, we write, debug, and optimize. Welcome to the world of code!',
			'Welcome to the world of coding, @${e.userDisplayName}. Where the only limit is your imagination. Let\'s write some awesome code together!',
			'@${e.userDisplayName}, welcome to the world of logic and algorithms. Let\'s explore the fascinating world of coding together!'
		]
	},
	{
		name: 'Sea of Thieves',
		gameId: '490377',
		followerMessages: [
			'Welcome aboard, @${e.userDisplayName}. Let\'s set sail and seek our fortunes on the high seas of Sea of Thieves!',
			'Ahoy, @${e.userDisplayName}! You\'ve joined a crew of swashbucklers and rogues on a quest for treasure. Welcome to Sea of Thieves!',
			'@${e.userDisplayName}, welcome to the pirate\'s life. Get ready for adventure, danger, and plenty of rum!',
			'Hoist the sails and batten down the hatches, @${e.userDisplayName}. You\'re now part of the Sea of Thieves crew. Welcome!',
			'Ahoy, @${e.userDisplayName}! Let\'s pillage and plunder our way to riches on the high seas. Welcome to Sea of Thieves!',
			'Avast, @${e.userDisplayName}! Prepare to chart a course through perilous waters and uncover the secrets of the Sea of Thieves. Welcome aboard, matey!'
		]
	},
	{
		name: 'Space Engineers',
		gameId: '391475',
		followerMessages: [
			'Welcome aboard, @${e.userDisplayName}! Prepare for an out-of-this-world experience in Space Engineers.',
			'Attention, space enthusiasts! @${e.userDisplayName} has joined the crew. Let\'s embark on a thrilling journey through the cosmos.',
			'Greetings, @${e.userDisplayName}! Get ready to engineer your way to the stars and beyond in Space Engineers. Let\'s build a universe together.',
			'Welcome to the stream, @${e.userDisplayName}! Prepare to witness the marvels of space exploration and the endless possibilities of Space Engineers.',
			'Calling all aspiring astronauts! @${e.userDisplayName} has joined the mission. Let\'s launch into an epic adventure in Space Engineers.',
			'Attention, stargazers! @${e.userDisplayName} is here to explore the vast depths of space with us in Space Engineers. Join the cosmic odyssey!'
		]
	},
	{
		name: 'DayZ',
		gameId: '65632',
		followerMessages: [
			'Survivor ${e.userDisplayName}, welcome to the unforgiving world of DayZ. May your wits be sharp and your aim true.',
			'Prepare yourself, ${e.userDisplayName}, for a journey of survival and perseverance in the post-apocalyptic wasteland. Welcome to DayZ.',
			'Step cautiously, ${e.userDisplayName}, as you enter the land where trust is scarce and danger lurks around every corner. Welcome to the realm of DayZ.',
			'Embrace the challenge, ${e.userDisplayName}, as you join the ranks of those who struggle to survive. Welcome to the relentless world of DayZ.',
			'In the realm of DayZ, ${e.userDisplayName}, every decision matters. Trust no one and fight for your survival. Welcome to the chaos.',
			'Brace yourself, ${e.userDisplayName}, for the raw and immersive experience that awaits you in DayZ. Welcome, survivor, to this unforgiving journey.'
		]
	},
	{
		name: 'Rust',
		gameId: '263490',
		followerMessages: [
			'🪓 Welcome to the crew, ${e.userDisplayName}! Grab your pickaxe, we\'re about to gather some serious resources together! 💎🌲',
			'🏠 Hey ${e.userDisplayName}! Thanks for joining our community. Let\'s build the strongest virtual base on Twitch! 🚧🔨',
			'🌐 Welcome to the tribe, ${e.userDisplayName}! Get ready to survive and thrive in the wild world of Twitch Rust. 🛡️⚔️',
			'🛠️ Shoutout to ${e.userDisplayName} for the follow! Time to craft some legendary moments together. 🔧✨',
			'Howdy, ${e.userDisplayName}! Your follow is like finding a barrel of loot in the wilderness. Let\'s explore Twitch together! 🌄🔍',
			'🚀 Welcome ${e.userDisplayName} to our radiation - free Twitch zone! No hazmat suits required, just good vibes and gaming. 🎮😄',
			'⚔️ A salute to ${e.userDisplayName} for joining the ranks! Together, we\'ll conquer the challenges of Rust. 🛡️🌐',
			'🚧 Hey ${e.userDisplayName}! Your follow is like laying a foundation. Let\'s build something epic on Twitch! 🏰🛠️',
			'🏛️ Welcome, ${e.userDisplayName}! Just like exploring a Rust monument, our journey together is full of surprises. Let\'s uncover the mysteries of Twitch! 🔍🌐',
			'⚔️ ${e.userDisplayName}, gear up! Your follow just armed us for the next raid. Together, we\'ll conquer Twitch like raiding a rival base in Rust! 💣🚁'
		]
	},
	{
		name: '7 Days To Die',
		gameId: '271304',
		followerMessages: [
			'Survivor ${e.userDisplayName}, welcome to the apocalypse. May your aim be steady and your fortifications strong!',
			'Greetings, ${e.userDisplayName}! In the harsh world of 7 Days to Die, every ally counts. Welcome!',
			'Brace yourself, ${e.userDisplayName}. The undead are relentless, but together we shall prevail!',
			'Welcome, ${e.userDisplayName!} Let\'s gather resources and build our haven in this forsaken land!',
			'In the land of the undead, ${e.userDisplayName}, your survival instincts will be your greatest asset. Welcome!',
			'Stay sharp, ${e.userDisplayName}! The night is dark and full of terrors. Welcome to the world of 7 Days to Die!',
			'Welcome to the survivor\'s club, ${e.userDisplayName}. Let\'s fortify and prepare for the horrors that await!',
			'Survival is a team effort, ${e.userDisplayName}. Thanks for joining us in the fight against the undead!',
			'The apocalypse is tough, but with you here, ${e.userDisplayName}, we stand a better chance. Welcome!',
			'Welcome, ${e.userDisplayName}! Let\'s craft, scavenge, and survive in the brutal world of 7 Days to Die!'
		]
	},
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
	{
		name: 'default',
		followerMessages: [
			'@${e.userDisplayName} has followed the channel',
			'@${e.userDisplayName} has joined the army and entered the barracks',
			'Brace yourself, @${e.userDisplayName} has followed',
			'HEY! LISTEN! @${e.userDisplayName} has followed',
			'We\'ve been expecting you @${e.userDisplayName}',
			'@${e.userDisplayName} just followed, quick everyone look busy',
			'Challenger Approaching - @${e.userDisplayName} has followed',
			'Welcome @${e.userDisplayName}, stay awhile and listen',
			'@${e.userDisplayName} has followed, it\'s super effective',
			'@${e.userDisplayName} has joined the party! Let\'s rock and roll!',
			'Looks like @${e.userDisplayName} is ready for an adventure! Welcome to the team!',
			'The hero we need has arrived! Welcome, @${e.userDisplayName}!',
			'@${e.userDisplayName} has leveled up! Welcome to the next stage of the journey!',
			'It\'s dangerous to go alone, @${e.userDisplayName}. Take this warm welcome!',
			'Welcome to the battlefield, @${e.userDisplayName}. Let\'s conquer together!',
		],
	},
];

const userTokenData = {
	user_id: '659523613',
	login: 'opendevbot',
	access_token: 'c9a9awbt3mg0j0638vg31e74jkz5s5',
	refresh_token: 'loutch2hnlibbqpyols4xfbfz07l3pkn9ynejinff9skch4hkq',
	scope: ['bits:read',
		'channel:edit:commercial',
		'channel:manage:broadcast',
		'channel:manage:moderators',
		'channel:manage:polls',
		'channel:manage:predictions',
		'channel:manage:raids',
		'channel:manage:redemptions',
		'channel:manage:schedule',
		'channel:manage:vips',
		'channel:read:editors',
		'channel:read:goals',
		'channel:read:hype_train',
		'channel:read:polls',
		'channel:read:predictions',
		'channel:read:redemptions',
		'channel:read:subscriptions',
		'channel:read:vips',
		'channel_subscriptions',
		'clips:edit',
		'moderation:read',
		'moderator:manage:announcements',
		'moderator:manage:automod',
		'moderator:manage:automod_settings',
		'moderator:manage:banned_users',
		'moderator:manage:blocked_terms',
		'moderator:manage:chat_messages',
		'moderator:manage:chat_settings',
		'moderator:manage:guest_star',
		'moderator:manage:shield_mode',
		'moderator:manage:shoutouts',
		'moderator:read:automod_settings',
		'moderator:read:blocked_terms',
		'moderator:read:chat_settings',
		'moderator:read:chatters',
		'moderator:read:followers',
		'moderator:read:guest_star',
		'moderator:read:shield_mode',
		'moderator:read:shoutouts',
		'user:edit',
		'user:edit:broadcast',
		'user:edit:follows',
		'user:manage:blocked_users',
		'user:manage:whispers',
		'user:read:blocked_users',
		'user:read:broadcast',
		'user:read:email',
		'user:read:follows',
		'user:read:subscriptions'],
	expires_in: 13202,
	obtainmentTimestamp: Math.floor(Date.now() / 1000),
	broadcaster_type: 'streamer'
};

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
async function seedFollowerMessages() {
	const mongoUri = process.env.Enviroment === 'prod' ? process.env.MONGO_URI as string : process.env.DOCKER_URI as string;
	await mongoose.connect(mongoUri, { autoIndex: true });

	if (process.env.Enviroment === 'dev' || process.env.Enviroment === 'debug') {
		const existingEntries = await FollowMessage.find({});
		if (existingEntries.length > 0) {
			console.log('Deleting Existing Data');
			await FollowMessage.deleteMany({});
			console.log('Successfully Deleted all Data');
		}
	}


	// Adjust the mapping to ensure all properties align with FollowMessageDoc
	const insertDocuments: FollowMessageDoc[] = followerRandomMessages.map(game => ({
		gameId: game.gameId !== undefined ? game.gameId : '',
		name: game.name,
		messages: game.followerMessages,
	})) as FollowMessageDoc[];

	await FollowMessage.insertMany(insertDocuments);

	console.log('Database seeded successfully!');

	// Insert user token
	await TokenModel.create(userTokenData);
	console.log('User Token seeded successfully!');
	await mongoose.disconnect();
}

seedFollowerMessages().catch((err: unknown) => {
	if (err instanceof Error) {
		console.error('Error seeding the database: ', err.cause + ': ' + err.name + ': ' + err.message + ': ' + err.stack);
	}
});