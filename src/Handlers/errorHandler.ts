import { EmbedBuilder, WebhookClient } from 'discord.js';
import { Error, connection } from 'mongoose';
import { client } from '../discord';

export async function initializeErrorHandling(webhookClient: WebhookClient) {
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

	// Handler for uncaught errors
	process.on('uncaughtException', async (err: Error, origin: NodeJS.UncaughtExceptionOrigin) => {
		console.error(err, origin);
		if (!webhookClient) return;

		let errorMessage = 'An uncaught exception occurred.';
		let errorTitle = 'Uncaught Exception';

		if (err instanceof SyntaxError) {
			errorMessage = 'A syntax error occurred in the code.';
			errorTitle = 'Syntax Error';
		} else if (err instanceof ReferenceError) {
			errorMessage = 'A reference error occurred. Check if variables or functions are properly defined and in scope.';
			errorTitle = 'Reference Error';
		} else if (err instanceof TypeError) {
			errorMessage = 'A type error occurred. Verify the types of values and object methods being used.';
			errorTitle = 'Type Error';
		}

		const errorEmbed = new EmbedBuilder().setColor('Red').setTitle(errorTitle).setDescription(`**Error**:\n\`\`\`\n${errorMessage}\n\`\`\``);
		await webhookClient.send({ embeds: [errorEmbed] });
	});

	process.on('uncaughtExceptionMonitor', async (err: Error, orgin: NodeJS.UncaughtExceptionOrigin) => {
		console.error(err, orgin);

		if (!webhookClient) return;
		await webhookClient.send({ embeds: [errorEmbed.setDescription('**Uncaught Exception/Catch: (MONITOR)\n\n** ```' + err + '\n\n' + orgin.toString() + '```').setTitle(err.name)] });
		return;
	});

	process.on('warning', async(warn: globalThis.Error) => {
		console.warn(warn);

		if (!webhookClient) return;
		await webhookClient.send({ embeds: [errorEmbed.setColor('Yellow').setTitle(`${warn.name}`).setDescription('**Warning**: ```' + warn.message + '```').addFields([{ name: 'Error Stack', value: `\`${warn.stack}\``, inline: false }])] });
		return;
	});

	connection.on('error', async (err: Error) => {
		console.error(err);

		if (!webhookClient) return;
		await webhookClient.send({ embeds: [errorEmbed.setColor('Red').setTitle(`${err.name}`).setDescription('**Warning**: ```' + err.message + '```').addFields([{ name: 'Error Stack', value: `\`${err.stack}\``, inline: false }])] });
		return;
	});

	client.on('invalidated', async () => {
		console.warn('Client session invalidated');
		if (!webhookClient) return;
	
		const message = 'The client session has been invalidated. Possible causes include authentication failure or rate limits.';
		const embed = errorEmbed.setColor('Red').setTitle('Invalidated Session').setDescription(`**Warning**:\n\`\`\`\n${message}\n\`\`\``);
		await webhookClient.send({ embeds: [embed] });
	});
	
	connection.on('reconnectFailed', async () => {
		console.error('Database reconnection failed');
		if (!webhookClient) return;
	
		const message = 'Failed to reconnect to the database.';
		const embed = errorEmbed.setColor('Red').setTitle('Database Reconnection Failed').setDescription(`**Error**:\n\`\`\`\n${message}\n\`\`\``);
		await webhookClient.send({ embeds: [embed] });
	});

	client.on('shardError', (error: Error, shardID: number) => {
		console.error(`Shard Error (Shard ${shardID}):`, error);
		if (!webhookClient) return;
		// Send the error information to the Discord channel
	});

	// Handler for network errors
	client.on('error', async (err: Error) => {
		console.error(err);
		if (!webhookClient) return;

		const errorMessage = 'A network error occurred. Check your network connectivity or server availability.';
		const errorEmbed = new EmbedBuilder().setColor('Red').setTitle('Network Error').setDescription(`**Error**:\n\`\`\`\n${errorMessage}\n\`\`\``);
		await webhookClient.send({ embeds: [errorEmbed] });
	});
}