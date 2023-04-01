"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const channelSchema = new mongoose_1.default.Schema({
    twitchId: {
        type: String,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    enabled: {
        type: Boolean,
        required: true,
        default: false
    },
});
const channelModel = mongoose_1.default.model('channel', channelSchema); // channels
exports.default = channelModel;
