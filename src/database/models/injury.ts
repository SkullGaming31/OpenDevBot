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

const InjuryModel = mongoose.model<InjuryData>('Injury', injurySchema);

export { InjuryModel, InjuryData };