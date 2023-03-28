import { ChannelType, EmbedBuilder }  from'discord.js';
import { client } from '../index';

export function errorHandler() {
    const Channel = client.channels.cache.get('961753379405692969');

const errorEmbed = new EmbedBuilder().setColor('Red').setTitle('⚠ | Error Encountered').setFooter({ text: 'Development Error' }).setTimestamp();

    client.on('error', async(err: Error) => {
        if (!Channel) return;
        if (Channel.type === ChannelType.GuildText) await Channel.send({ embeds: [errorEmbed.setDescription('**Discord Error** ```' + '\n' + err + '\n' + '```')] });
    });
    client.on('warn', async (info: string) => {
        console.warn('Discord Warning:' + info);

        if (!Channel) return;
        if (Channel.type === ChannelType.GuildText) await Channel.send({ embeds: [errorEmbed.setColor('Yellow').setDescription('**DiscordWarning**: ```' + info + '```')] });
    });
    process.on('unhandledRejection', async (reason: string, p: Promise<unknown>) => {
        console.error(reason, p);
    
        if (!Channel) return;
        if (Channel.type === ChannelType.GuildText) 
        await Channel.send({ embeds: [errorEmbed.setDescription('**Unhandled Rejection/Catch: \n\n** ```' + reason + '```')] });
        // tbd.send({ embeds: [errorEmbed.setDescription('**Unhandled Rejection/Catch: \n\n** ```' + reason + '```')] });
    });
    process.on('uncaughtException', async (err: Error, orgin: NodeJS.UncaughtExceptionOrigin) => { 
        console.error(err, origin);
        
        if (!Channel) return;
        if (Channel.type === ChannelType.GuildText) await Channel.send({ embeds: [errorEmbed.setDescription('**Uncaught Exception/Catch:\n\n** ```' + err + '\n\n' + orgin.toString() + '```')] });
        // tbd.send({ embeds: [errorEmbed.setDescription('**Uncaught Exception/Catch:\n\n** ```' + err + '\n\n' + orgin.toString() + '```')] });
    });
    process.on('uncaughtExceptionMonitor', async (err: Error, orgin: NodeJS.UncaughtExceptionOrigin) => { 
        console.error(err, origin); 
    
        if (!Channel) return;
        if (Channel.type === ChannelType.GuildText) await Channel.send({ embeds: [errorEmbed.setDescription('**Uncaught Exception/Catch: (MONITOR)\n\n** ```' + err + '\n\n' + orgin.toString() + '```')] });
        // tbd.send({ embeds: [errorEmbed.setDescription('**Uncaught Exception/Catch: (MONITOR)\n\n** ```' + err + '\n\n' + orgin.toString() + '```')] });
    });
    process.on('multipleResolves', async(type: NodeJS.MultipleResolveType, promise: Promise<unknown>, reason: string) => { 
        console.error(type, promise, reason);
    
        if (!Channel) return;
        if (Channel.type === ChannelType.GuildText) await Channel.send({ embeds: [errorEmbed.setDescription('**MultipleResolves\n\n** ```' + type + '\n' + promise + '\n' + reason + '```')] });
        // tbd.send({ embeds: [errorEmbed.setDescription('**MultipleResolves\n\n** ```' + type + '\n' + promise + '\n' + reason + '```')] });
    });
    process.on('warning', async(warn: Error) => { 
        console.warn(warn);
    
        if (!Channel) return;
        if (Channel.type === ChannelType.GuildText) await Channel.send({ embeds: [errorEmbed.setColor('Yellow').setTitle(`${warn.name}`).setDescription('**Warning**: ```' + warn.message + '```').addFields([ { name: 'Error Stack', value: `\`${warn.stack}\``, inline: false }])] });
        // tbd.send({ embeds: [errorEmbed.setColor('Yellow').setDescription('**Warning**: ```' + warn + '```')] });
    });
}