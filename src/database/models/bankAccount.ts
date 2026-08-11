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

const balanceDefault = { bank: 0, wallet: 0 };

const bankAccountSchema = new Schema<IBankAccount>({
	userId: { type: String, required: true, unique: true },
	username: { type: String, required: false },
	// Accept legacy numeric balance values by normalizing them into { bank, wallet }
	balance: {
		type: Schema.Types.Mixed,
		required: true,
		default: balanceDefault,
		set: (v: unknown) => {
			if (typeof v === 'number') return { bank: v, wallet: 0 };
			if (v == null) return balanceDefault;
			return v as unknown as Record<string, unknown>;
		}
	},
}, { timestamps: true });

const BankAccount = model<IBankAccount>('BankAccount', bankAccountSchema);
export default BankAccount;
