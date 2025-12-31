import { Schema, model } from 'mongoose';

export interface LurkMessage extends Document {
	id: string;
	displayName: string;
	displayNameLower: string;
	message: string;
}

const LurkMessageSchema = new Schema<LurkMessage>({
	id: { type: String, required: true, unique: true, index: true },
	displayName: { type: String, required: true },
	// Lowercase copy of displayName for efficient case-insensitive lookups
	displayNameLower: { type: String, required: true, index: true },
	message: { type: String, required: false, default: 'No Afk message set' },
});

export const LurkMessageModel = model<LurkMessage>('LurkMessage', LurkMessageSchema);