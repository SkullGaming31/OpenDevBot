import mongoose, { ConnectOptions, MongooseError } from 'mongoose';

export async function init() {
	try {
		mongoose.set('strictQuery', true);
		const database = await mongoose.connect(process.env.MONGO_URI as string, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
			user: process.env.MONGO_USER as string,
			pass: process.env.MONGO_PASS as string,
			dbName: process.env.MONGO_DB as string
		} as ConnectOptions);
		console.log('Twitch Database Connected');

		mongoose.connection.on('disconnected', () => {
			console.log('Twitch Database Disconnected');
			mongoose.connection.removeAllListeners();
			mongoose.disconnect();
		});

		mongoose.connection.on('connected', () => {
			console.log('Twitch Database Connected');
		});

		mongoose.connection.on('reconnected', () => {
			console.log('Twitch Database re-Connected');
		});

		mongoose.connection.on('error', (err: MongooseError) => {
			console.error('Twitch Database Error:', err);
			mongoose.connection.removeAllListeners();
			mongoose.disconnect();
		});

	} catch (error: any) {
		console.error('Twitch Database Error:', error);
		mongoose.disconnect();
	}
}

// import mysql from 'mysql2/promise';
// import createUsersTableQuery from './models/userModel';

// export async function init() {
// 	try {
// 		const connection = await mysql.createConnection({
// 			host: process.env.MYSQL_HOST,
// 			user: process.env.MYSQL_USER,
// 			password: process.env.MYSQL_PASSWORD,
// 			database: process.env.MYSQL_DATABASE,
// 		});

// 		console.log('Twitch Database Connected');

// 		await connection.execute(createUsersTableQuery);

// 		connection.on('error', (err) => {
// 			console.error('Twitch Database Error:', err);
// 			connection.end();
// 		});

// 	} catch (error: any) {
// 		console.error('Twitch Database Error:', error);
// 	}
// }