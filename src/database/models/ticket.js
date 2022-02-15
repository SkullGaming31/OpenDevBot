const { model, Schema } = require('mongoose');

const ticketSchema = new Schema({
	GuildID: String,
	MembersID: [String],
	TicketID: String,
	ChannelID: String,
	Closed: Boolean,
	Locked: Boolean,
	Type: String
});

/**
 * @typedef ticketModel
 * @prop {string} GuildID
 * @prop {string} MembersID
 * @prop {string} TicketID
 * @prop {string} ChannelID
 * @prop {boolean} Closed
 * @prop {boolean} Locked
 * @prop {string} Type
 */

/** @type {ticketModel | import('mongoose').Document} */

const ticketModel = model('ticket', ticketSchema);// users
module.exports = ticketModel;