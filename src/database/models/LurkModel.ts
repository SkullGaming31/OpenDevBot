import { Schema, model } from 'mongoose';
import { LurkMessage } from '../../interfaces/apiInterfaces';

const LurkMessageSchema = new Schema<LurkMessage>({
	userId: { type: String, required: true, unique: true },
	displayName: { type: String, required: false },
	message: { type: String, required: false },
});

export const LurkMessageModel = model<LurkMessage>('LurkMessage', LurkMessageSchema);
// export default LurkMessageModel;