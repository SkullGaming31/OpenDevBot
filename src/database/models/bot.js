const { model, Schema } = require('mongoose');

const botScema = new Schema({
	name: {
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
	scopes: {
		type: [String],
		required: true
	},
	expiresIn: {
		type: String,
		required: true
	},
	obtainmentTimestamp: {
		type: String,
		required: true
	}
});

/**
 * @typedef botModel
 * @prop {string} name
 * @prop {string} access_token
 * @prop {string} refresh_token
 * @prop {string} expiresIn
 * @prop {string} obtainmentTimestamp
 */

/** @type {botModel | import('mongoose').Document} */

const botModel = model('Bot', botScema);
model.exports = botModel;