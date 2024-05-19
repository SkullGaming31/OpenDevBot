import mongoose from 'mongoose';
import { Injury } from '../../Commands/Fun/heist';
import { InjuryModel } from './injury';

// Define the model for Participant
interface Participant extends mongoose.Document {
  name: string;
  injuries: Injury[];
}

// Define the schema for Participant
const participantSchema = new mongoose.Schema<Participant>({
	name: { type: String, required: true },
	injuries: [InjuryModel],
});


export const ParticipantModel = mongoose.model<Participant>('Participant', participantSchema);