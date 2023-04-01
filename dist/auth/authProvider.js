"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const auth_1 = require("@twurple/auth");
const fs_1 = require("fs");
(async () => {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const clientSecret = process.env.TWITCH_CLIENT_SECRET;
    const botTokenData = JSON.parse(await fs_1.promises.readFile('./src/auth/tokens/token.659523613.json', 'utf-8')); // 659523613
    const authProvider = new auth_1.RefreshingAuthProvider({
        clientId,
        clientSecret,
        onRefresh: async (userId, newTokenData) => await fs_1.promises.writeFile(`./src/auth/tokens/token.${userId}.json`, JSON.stringify(newTokenData, null, 4), 'utf-8')
    });
    authProvider.addUser('659523613', botTokenData, ['chat']);
    authProvider.addIntentsToUser('659523613', ['chat']);
    const userTokenData = JSON.parse(await fs_1.promises.readFile('./src/auth/tokens/token.31124455.json', 'utf-8')); // 31124455
    const userAuthProvider = new auth_1.RefreshingAuthProvider({
        clientId,
        clientSecret,
        onRefresh: async (userId, newTokenData) => await fs_1.promises.writeFile(`./src/auth/tokens/token.${userId}.json`, JSON.stringify(newTokenData, null, 4), 'utf-8')
    });
    userAuthProvider.addUser('31124455', userTokenData, ['chat']);
    userAuthProvider.addIntentsToUser('31124455', ['chat']);
})();
