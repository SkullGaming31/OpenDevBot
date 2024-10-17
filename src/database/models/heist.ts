import { model, Schema } from 'mongoose';
interface IHeist extends Document {
	id: string;
	username: string;
	severity: string;
	duration: number;
	description?: string;
}

const heistSchema = new Schema<IHeist>({
	id: { type: String, unique: true, index: true },
	username: { type: String, required: true },
	severity: { type: String, required: true },
	duration: { type: Number, required: true },
	description: { type: String },
});

const heistModel = model<IHeist>('heist', heistSchema);// Heist Data
export default heistModel;