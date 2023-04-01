import { ChannelType, EmbedBuilder }  from'discord.js';
import { client } from '../discord';
import { WebhookClient } from 'discord.js';

export async function errorHandler() {
	const webhookClient = new WebhookClient({ url: process.env.DEV_DISCORD_ERROR_WEBHOOK as string });

	const errorEmbed = new EmbedBuilder().setColor('Red').setTitle('⚠ | Error Encountered').setFooter({ text: 'Development Error' }).setTimestamp();

	client.on('error', async(err: Error) => {
		console.error(err);
		if (!webhookClient) return;
		await webhookClient.send({ embeds: [errorEmbed.setDescription('**Discord Error** ```' + '\n' + err + '\n' + '```')] });
		return;
	});

	client.on('warn', async (info: string) => {
		console.warn('Discord Warning:' + info);

		if (!webhookClient) return;
		await webhookClient.send({ embeds: [errorEmbed.setColor('Yellow').setDescription('**DiscordWarning**: ```' + info + '```')] });
		return;
	});

	process.on('unhandledRejection', async (reason: string, p: Promise<unknown>) => {
		console.error(reason, p);

		if (!webhookClient) return;
		await webhookClient.send({ embeds: [errorEmbed.setDescription('**Unhandled Rejection/Catch: \n\n** ```' + reason + '```')] });
		return;
	});

	process.on('uncaughtException', async (err: Error, orgin: NodeJS.UncaughtExceptionOrigin) => {
		console.error(err, orgin);

		if (!webhookClient) return;
		await webhookClient.send({ embeds: [errorEmbed.setDescription('**Uncaught Exception/Catch:\n\n** ```' + err + '\n\n' + orgin.toString() + '```')] });
		return;
	});

	process.on('uncaughtExceptionMonitor', async (err: Error, orgin: NodeJS.UncaughtExceptionOrigin) => {
		console.error(err, orgin);

		if (!webhookClient) return;
		await webhookClient.send({ embeds: [errorEmbed.setDescription('**Uncaught Exception/Catch: (MONITOR)\n\n** ```' + err + '\n\n' + orgin.toString() + '```')] });
		return;
	});

	process.on('warning', async(warn: Error) => {
		console.warn(warn);

		if (!webhookClient) return;
		await webhookClient.send({ embeds: [errorEmbed.setColor('Yellow').setTitle(`${warn.name}`).setDescription('**Warning**: ```' + warn.message + '```').addFields([{ name: 'Error Stack', value: `\`${warn.stack}\``, inline: false }])] });
		return;
	});
}