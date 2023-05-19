import { Document, Schema, model } from 'mongoose';

export interface Bots extends Document {
  id: string;
  username: string;
}

const knownBotSchema = new Schema<Bots>({
	id: { type: String, required: true },
	username: { type: String, required: true, unique: true }
});

export const knownBotsModel = model<Bots>('bots', knownBotSchema);

export default knownBotsModel;