import { model, Schema, Document } from 'mongoose';

interface AccessToken extends Document {
  accessToken: string;
  refreshToken: string;
  scopes: string[];
  expiresIn: number;
  obtainmentTimestamp: number;
}

const accessTokenSchema = new Schema<AccessToken>({
	accessToken: { type: String, required: true },
	refreshToken: { type: String, required: true },
	scopes: { type: [String], required: true },
	expiresIn: { type: Number, default: 0 },
	obtainmentTimestamp: { type: Number, default: 0 },
});

const AccessTokenModel = model<AccessToken>('AccessToken', accessTokenSchema);

export { AccessToken, AccessTokenModel };