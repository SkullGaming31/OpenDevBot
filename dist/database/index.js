"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
require("./models/bot");
require("./models/user");
// mongodb+srv://<username>:<password>@twitch.7ipbc.mongodb.net/Twitch?retryWrites=true&w=majority
// mongodb+srv://${config.MONGO_USER}:${config.MONGO_PASS}@twitch.7ipbc.mongodb.net/${config.MONGO_DB}?retryWrites=true&w=majority
async function init() {
    mongoose_1.default.set('strictQuery', true);
    await mongoose_1.default.connect(`${process.env.MONGO_URI}`);
    const { connection: DB } = mongoose_1.default;
    DB.on('connected', () => { console.log('Twitch Database Connected'); });
    DB.on('disconnected', () => { console.log('Twitch Database Disconnected'); });
    DB.on('error', (err) => { console.error('Twitch Database Error:' + err.message); });
}
exports.init = init;
