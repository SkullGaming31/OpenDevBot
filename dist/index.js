"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const twitchChat_1 = require("./twitchChat");
const database_1 = require("./database");
const errorHandler_1 = require("./Handlers/errorHandler");
const createApp_1 = require("./util/createApp");
async function run() {
    await (0, twitchChat_1.twitchChat)();
    await (0, errorHandler_1.errorHandler)().then(() => { console.log('Error Handler Initialized'); });
    await (0, database_1.init)(); // database not loading
    (0, createApp_1.createApp)();
}
run();
