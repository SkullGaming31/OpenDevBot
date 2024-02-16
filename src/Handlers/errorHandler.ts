import { EmbedBuilder, WebhookClient } from 'discord.js';
import { Error } from 'mongoose';
import { client } from '../discord';

export async function initializeErrorHandling(webhookClient: WebhookClient) {
	if (!webhookClient) {
		console.warn('No webhook client provided for error handling.');
		return;
	}

	const errorEmbed = new EmbedBuilder()
		.setColor('Red')
		.setTitle('⚠ | Error Encountered')
		.setFooter({ text: 'Development Error' })
		.setTimestamp();

	client.on('error', async (err: Error) => {
		console.error(err);
		await sendErrorToWebhook(err, 'Discord Error', webhookClient, errorEmbed);
	});

	client.on('warn', async (info: string) => {
		console.warn('Discord Warning:', info);
		errorEmbed.setColor('Yellow');
		await sendErrorToWebhook(info, 'Discord Warning', webhookClient, errorEmbed);
	});

	process.on('unhandledRejection', async (reason: unknown, p: Promise<unknown>) => {
		console.error(reason, p);
		if (typeof reason === 'string') {
			await sendErrorToWebhook(reason, 'Unhandled Rejection/Catch', webhookClient, errorEmbed);

		} else if (reason instanceof Error) {
			await sendErrorToWebhook(reason, 'Unhandled Rejection/Catch', webhookClient, errorEmbed);
		} else {
			console.error('Unhandled rejection with unknown reason:', reason);
		}
	});

	process.on('uncaughtException', async (err: Error) => {
		console.error(err);
		await sendErrorToWebhook(err, 'Uncaught Exception', webhookClient, errorEmbed);
	});

	// Other error handlers...

	async function sendErrorToWebhook(error: Error | string, title: string, client: WebhookClient, embed: EmbedBuilder) {
		const description = typeof error === 'string' ? error : error.message;
		const errorEmbed = embed.setDescription(`**Error**:\n\`\`\`\n${description}\n\`\`\``);
		await webhookClient.send({ embeds: [errorEmbed] });
	}
}
