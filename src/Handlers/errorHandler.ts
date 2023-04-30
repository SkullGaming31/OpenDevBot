import { EmbedBuilder, WebhookClient } from 'discord.js';
import { Error, connection } from 'mongoose';
import { client } from '../discord';

export async function errorHandler(webhookClient: WebhookClient) {
	const errorEmbed = new EmbedBuilder().setColor('Red').setTitle('⚠ | Error Encountered').setFooter({ text: 'Development Error' }).setFooter({ text: 'Twitch Chatbot Error' }).setTimestamp();

	client.on('error', async(err: Error) => {
		console.error(err);
		if (!webhookClient) return;
		await webhookClient.send({ embeds: [errorEmbed.setDescription('**Discord Error** ```' + '\n' + err + '\n' + '```').setTitle(err.name)] });
		return;
	});

	client.on('warn', async (info: string) => {
		console.warn('Discord Warning:' + info);

		if (!webhookClient) return;
		await webhookClient.send({ embeds: [errorEmbed.setColor('Yellow').setDescription('**DiscordWarning**: ```' + info + '```')] });
		return;
	});

	process.on('unhandledRejection', async (reason: unknown, p: Promise<unknown>) => {
		console.error(reason, p);

		if (!webhookClient) return;
		await webhookClient.send({ embeds: [errorEmbed.setDescription('**Unhandled Rejection/Catch: \n\n** ```' + reason + '```')] });
		return;
	});

	process.on('uncaughtException', async (err: Error, orgin: NodeJS.UncaughtExceptionOrigin) => {
		console.error(err, orgin);

		if (!webhookClient) return;
		await webhookClient.send({ embeds: [errorEmbed.setDescription('**Uncaught Exception/Catch:\n\n** ```' + err + '\n\n' + orgin.toString() + '```').setTitle(err.name)] });
		return;
	});

	process.on('uncaughtExceptionMonitor', async (err: Error, orgin: NodeJS.UncaughtExceptionOrigin) => {
		console.error(err, orgin);

		if (!webhookClient) return;
		await webhookClient.send({ embeds: [errorEmbed.setDescription('**Uncaught Exception/Catch: (MONITOR)\n\n** ```' + err + '\n\n' + orgin.toString() + '```').setTitle(err.name)] });
		return;
	});

	process.on('warning', async(warn: Error) => {
		console.warn(warn);

		if (!webhookClient) return;
		await webhookClient.send({ embeds: [errorEmbed.setColor('Yellow').setTitle(`${warn.name}`).setDescription('**Warning**: ```' + warn.message + '```').addFields([{ name: 'Error Stack', value: `\`${warn.stack}\``, inline: false }])] });
		return;
	});

	connection.on('error', async (err: Error) => {
		console.error(err.message);

		if (!webhookClient) return;
		await webhookClient.send({ embeds: [errorEmbed.setColor('Red').setTitle(`${err.name}`).setDescription('**Warning**: ```' + err.message + '```').addFields([{ name: 'Error Stack', value: `\`${err.stack}\``, inline: false }])] });
		return;
	});
}