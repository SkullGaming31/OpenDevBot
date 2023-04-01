"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const discord_js_1 = require("discord.js");
const discord_1 = require("../discord");
async function errorHandler() {
    const Channel = discord_1.client.channels.cache.get('961753379405692969');
    const errorEmbed = new discord_js_1.EmbedBuilder().setColor('Red').setTitle('⚠ | Error Encountered').setFooter({ text: 'Development Error' }).setTimestamp();
    discord_1.client.on('error', async (err) => {
        if (!Channel)
            return;
        if (Channel.type === discord_js_1.ChannelType.GuildText)
            await Channel.send({ embeds: [errorEmbed.setDescription('**Discord Error** ```' + '\n' + err + '\n' + '```')] });
        return;
    });
    discord_1.client.on('warn', async (info) => {
        console.warn('Discord Warning:' + info);
        if (!Channel)
            return;
        if (Channel.type === discord_js_1.ChannelType.GuildText)
            await Channel.send({ embeds: [errorEmbed.setColor('Yellow').setDescription('**DiscordWarning**: ```' + info + '```')] });
        return;
    });
    process.on('unhandledRejection', async (reason, p) => {
        console.error(reason, p);
        if (!Channel)
            return;
        if (Channel.type === discord_js_1.ChannelType.GuildText)
            await Channel.send({ embeds: [errorEmbed.setDescription('**Unhandled Rejection/Catch: \n\n** ```' + reason + '```')] });
        return;
    });
    process.on('uncaughtException', async (err, orgin) => {
        console.error(err, origin);
        if (!Channel)
            return;
        if (Channel.type === discord_js_1.ChannelType.GuildText)
            await Channel.send({ embeds: [errorEmbed.setDescription('**Uncaught Exception/Catch:\n\n** ```' + err + '\n\n' + orgin.toString() + '```')] });
        return;
    });
    process.on('uncaughtExceptionMonitor', async (err, orgin) => {
        console.error(err, origin);
        if (!Channel)
            return;
        if (Channel.type === discord_js_1.ChannelType.GuildText)
            await Channel.send({ embeds: [errorEmbed.setDescription('**Uncaught Exception/Catch: (MONITOR)\n\n** ```' + err + '\n\n' + orgin.toString() + '```')] });
        return;
    });
    // process.on('multipleResolves', async(type: NodeJS.MultipleResolveType, promise: Promise<unknown>, reason: string) => { 
    // 	console.error(type, promise, reason);
    // 	if (!Channel) return;
    // 	if (Channel.type === ChannelType.GuildText) await Channel.send({ embeds: [errorEmbed.setDescription('**MultipleResolves\n\n** ```' + type + '\n' + promise + '\n' + reason + '```')] });
    // 	return;
    // });
    process.on('warning', async (warn) => {
        console.warn(warn);
        if (!Channel)
            return;
        if (Channel.type === discord_js_1.ChannelType.GuildText)
            await Channel.send({ embeds: [errorEmbed.setColor('Yellow').setTitle(`${warn.name}`).setDescription('**Warning**: ```' + warn.message + '```').addFields([{ name: 'Error Stack', value: `\`${warn.stack}\``, inline: false }])] });
        return;
    });
}
exports.errorHandler = errorHandler;
