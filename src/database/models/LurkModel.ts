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
	// NOTE: This field must be kept in sync with `displayName` whenever it is
	// updated (e.g., on create/update) to ensure lookups are reliable.
	displayNameLower: { type: String, required: true, index: true },
	message: { type: String, required: false, default: 'No Afk message set' },
});

export const LurkMessageModel = model<LurkMessage>('LurkMessage', LurkMessageSchema);