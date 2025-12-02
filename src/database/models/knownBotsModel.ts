import { Document, Schema, model } from 'mongoose';

export interface Bots extends Document {
	id: string;
	username: string;
	addedBy?: string;
	addedFromChannel?: string;
	addedAt?: Date;
}

const knownBotSchema = new Schema<Bots>({
	id: { type: String, required: true },
	username: { type: String, required: true, unique: true },
	addedBy: { type: String, required: false },
	addedFromChannel: { type: String, required: false },
	addedAt: { type: Date, required: false, default: () => new Date() }
});

export const knownBotsModel = model<Bots>('bots', knownBotSchema);

export default knownBotsModel;