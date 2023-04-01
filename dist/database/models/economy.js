"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const economyScema = new mongoose_1.Schema({
    twitchId: {
        type: String,
        unique: true
    },
    skulls: {
        type: Number,
        required: true,
        default: 0
    }
});
const economyModel = (0, mongoose_1.model)('economy', economyScema); // users
exports.default = economyModel;
