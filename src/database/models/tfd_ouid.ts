import { model, Schema, Document } from 'mongoose';

interface TFDDoc extends Document {
  OUID: string;
  username?: string;
}

const tfdSchema = new Schema<TFDDoc>({
	OUID: { type: String, required: true },
	username: { type: String, required: false }
});

const tfd = model<TFDDoc>('tfdouid', tfdSchema);

export default tfd;