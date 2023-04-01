"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const userScema = new mongoose_1.Schema({
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
        required: false
    },
});
const userModel = (0, mongoose_1.model)('users', userScema);
exports.default = userModel;
