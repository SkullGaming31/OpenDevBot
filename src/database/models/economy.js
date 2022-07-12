const mongoose = require('mongoose');
const db = require('../index');

const economyScema = new mongoose.Schema({
  twitchId: {
    type: String,
    unique: true
  },
  skulls: {
    type: String,
    required: true,
    default: 0
  }
});

/**
 * @typedef economyModel
 * @prop {string} twitchId
 * @prop {string} skulls
 */

/** @type {economyModel | import('mongoose').Document} */

const economyModel = mongoose.model('economy', economyScema);// users
module.exports = economyModel;