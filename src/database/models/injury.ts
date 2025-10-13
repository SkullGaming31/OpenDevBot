import mongoose, { Schema, Document } from 'mongoose';

interface Injury {
	severity: string;
	duration: number;
	description: string;
	timestamp: number;
}

interface InjuryData extends Document {
	participantName: string;
	injuries: Injury[];
}

const injurySchema = new Schema<InjuryData>({
	participantName: { type: String, required: true },
	injuries: [{
		severity: { type: String, required: true },
		duration: { type: Number, required: true },
		description: { type: String, required: true },
		timestamp: { type: Number, required: true }
	}]
});

// Note: MongoDB TTL indexes cannot be created directly on array subdocument fields.
// To efficiently remove expired injury entries we add a non-unique index on the
// `injuries.timestamp` path. Cleanup is still performed at the application layer
// (see `src/index.ts` -> deleteExpiredInjuries) which uses $pull with a cutoff value.
injurySchema.index({ 'injuries.timestamp': 1 });

const InjuryModel = mongoose.model<InjuryData>('Injury', injurySchema);

export { InjuryModel, InjuryData };