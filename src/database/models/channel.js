const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  twitchId: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  enabled: {
    type: String,
    required: true
  },
});

/**
 * @typedef channelModel
 * @prop {string} twitchId
 * @prop {string} login
 * @prop {boolean} enabled
 */

/** @type {channelModel | import('mongoose').Document} */
const channelModel = mongoose.model('channel', channelSchema);// channels
module.exports = channelModel;