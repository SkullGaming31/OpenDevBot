import { Document, Model, Schema, model } from 'mongoose';

export interface Counter extends Document {
  counterName: string;
  value: number;
}

const counterSchema = new Schema<Counter>({
	counterName: { type: String, required: true, unique: true },
	value: { type: Number, required: true, default: 0 },
});

export const CounterModel: Model<Counter> = model<Counter>('Counter', counterSchema);

// export default CounterModel;