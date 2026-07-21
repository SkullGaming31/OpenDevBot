import { Schema, model, Document } from 'mongoose';

export interface IBankAccount extends Document {
	userId: string;
	username: string;
	balance: {
		bank: number;
		wallet: number;
	};
	createdAt: Date;
	updatedAt: Date;
}

const bankAccountSchema = new Schema<IBankAccount>({
	userId: { type: String, required: true, unique: true },
	username: { type: String, required: false },
	balance: {
		bank: { type: Number, required: true, default: 0 },
		wallet: { type: Number, required: true, default: 0 },
	},
}, { timestamps: true });

const BankAccount = model<IBankAccount>('BankAccount', bankAccountSchema);
export default BankAccount;
