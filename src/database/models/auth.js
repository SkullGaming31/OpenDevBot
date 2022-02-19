const mongoose = require('mongoose');
const db = require('../index');

const authScema = new mongoose.Schema({
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
		required: true
	},
});

/**
 * @typedef authModel
 * @prop {string} twitchId
 * @prop {string} access_token
 * @prop {string} refresh_token
 * @prop {string} expiresIn
 * @prop {string} obtainmentTimestamp
 */

/** @type {authModel | import('mongoose').Document} */

const authModel = mongoose.model('auth', authScema);// users
module.exports = authModel;