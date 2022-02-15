const mongoose = require('mongoose');
const db = require('../index');

const userScema = new mongoose.Schema({
	twitchId: {
		type: String,
		unique: true
	},
	access_token: {
		type: String,
		required: true
	},
	refresh_token: {
		type: String,
		require: true
	},
	expiresIn: {
		type: String,
		required: true
	},
	obtainmentTimestamp: {
		type: String,
		required: false
	},
});

/**
 * @typedef userModel
 * @prop {string} twitchId
 * @prop {string} access_token
 * @prop {string} refresh_token
 * @prop {string} expiresIn
 * @prop {string} obtainmentTimestamp
 */

/** @type {userModel | import('mongoose').Document} */

const userModel = mongoose.model('user', userScema);// users
module.exports = userModel;