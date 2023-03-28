import mongoose, { Error } from 'mongoose';
import './models/bot';
import './models/user';


// mongodb+srv://<username>:<password>@twitch.7ipbc.mongodb.net/Twitch?retryWrites=true&w=majority
// mongodb+srv://${config.MONGO_USER}:${config.MONGO_PASS}@twitch.7ipbc.mongodb.net/${config.MONGO_DB}?retryWrites=true&w=majority
export async function init() {
    await mongoose.connect(`${process.env.MONGO_URI}`);
    const { connection: DB } = mongoose;

    DB.on('connected', () => { console.log('Twitch Database Connected'); });
    DB.on('disconnected', () => { console.log('Twitch Database Disconnected'); });
    DB.on('error', (err: Error) => { console.error('Twitch Database Error:' + err.message); });
}