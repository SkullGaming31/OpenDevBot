import { Schema, model } from 'mongoose';

export interface LurkMessage extends Document {
  userId: string;
  displayName: string;
  message: string;
}

const LurkMessageSchema = new Schema<LurkMessage>({
	userId: { type: String, required: true, unique: true },
	displayName: { type: String, required: false },
	message: { type: String, required: false },
});

export const LurkMessageModel = model<LurkMessage>('LurkMessage', LurkMessageSchema);
// export default LurkMessageModel;