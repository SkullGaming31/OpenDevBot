import { Document, Schema, model } from 'mongoose';

export interface IQuote extends Document {
	_id: string;
  content: string;
}

const quoteSchema = new Schema<IQuote>({
	content: {
		type: String,
		required: true
	}
});

export default model<IQuote>('Quote', quoteSchema);