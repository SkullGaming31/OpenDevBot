"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const botScema = new mongoose_1.Schema({
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
        required: false
    },
});
const botModel = (0, mongoose_1.model)('user', botScema);
exports.default = botModel;
