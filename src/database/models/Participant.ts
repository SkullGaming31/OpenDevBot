import mongoose, { Schema, Document } from 'mongoose';

// Define the model for Participant
interface Participant extends Document {
  name: string;
  injuries: Schema.Types.ObjectId[]; // Use Schema.Types.ObjectId for references
}

// Define the schema for Participant
const participantSchema = new mongoose.Schema<Participant>({
	name: { type: String, required: true },
	injuries: [{ type: Schema.Types.ObjectId, ref: 'Injury' }], // Specify type as ObjectId and reference the Injury model
});

export const ParticipantModel = mongoose.model<Participant>('Participant', participantSchema);