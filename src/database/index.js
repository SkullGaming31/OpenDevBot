const config = require('../../config');
const mongoose = require('mongoose');
require('./models/bot');
require('./models/user');
// require('./models/channel');
// require('./models/ticket');


// mongodb+srv://<username>:<password>@twitch.7ipbc.mongodb.net/Twitch?retryWrites=true&w=majority
// mongodb+srv://${config.MONGO_USER}:${config.MONGO_PASS}@twitch.7ipbc.mongodb.net/${config.MONGO_DB}?retryWrites=true&w=majority
mongoose.connect(`mongodb+srv://${config.MONGO_USER}:${config.MONGO_PASS}@${config.MONGO_HOST}/${config.MONGO_DB}?retryWrites=true&w=majority`);
const { connection: db } = mongoose;


db.on('connected', () => { console.log('Twitch Database Connected'); });

db.on('disconnected', () => { console.log('Twitch Database Disconnected'); });

db.on('error', err => { console.error(err); });

module.exports = db;