import { InjuryModel } from '../database/models/injury';
import logger from '../util/logger';

/**
 * Deletes all documents from the injuries collection.
 */
export async function deleteAllInjuries(): Promise<void> {
	try {
		const deleteResult = await InjuryModel.deleteMany({});
		logger.info(`Deleted ${deleteResult.deletedCount} entries from the injuries collection.`);
	} catch (error) {
		logger.error('Error deleting all injuries:', error);
		throw error;
	}
}

/**
 * Remove expired injuries from documents' injuries arrays.
 * This keeps recent injuries while cleaning up old time-based entries.
 * Uses the `timestamp` numeric field stored in each injury (ms since epoch).
 */
export async function deleteExpiredInjuries(): Promise<void> {
	try {
		// Default TTL: 7 days (in milliseconds) unless INJURY_TTL_MS is provided
		const ttlMs = process.env.INJURY_TTL_MS ? Number(process.env.INJURY_TTL_MS) : 7 * 24 * 60 * 60 * 1000;
		const cutoff = Date.now() - ttlMs;

		// Pull expired injuries from the injuries array across all documents
		const result = await InjuryModel.updateMany({}, { $pull: { injuries: { timestamp: { $lt: cutoff } } } });
		logger.info(`Injury cleanup: removed expired injuries older than ${ttlMs}ms (cutoff=${new Date(cutoff).toISOString()}). Matched docs: ${result.matchedCount}, Modified docs: ${result.modifiedCount}`);

		// Optionally remove documents that now have an empty injuries array
		const removeEmpty = process.env.INJURY_REMOVE_EMPTY === 'true';
		if (removeEmpty) {
			const del = await InjuryModel.deleteMany({ injuries: { $size: 0 } });
			logger.info(`Injury cleanup: removed ${del.deletedCount} documents with no injuries.`);
		}
	} catch (error) {
		logger.error('Error during injury expiry cleanup:', error);
	}
}

export default { deleteAllInjuries, deleteExpiredInjuries };
