import { Document, Schema, model } from 'mongoose';

interface ChamberState extends Document {
	userId: string;
	bullets: number;
}

const chamberStateSchema = new Schema<ChamberState>({
	userId: { type: String, required: true, unique: true },
	bullets: { type: Number, required: true, default: 1 },
});

const ChamberStateModel = model<ChamberState>('ChamberState', chamberStateSchema);

export default ChamberStateModel;