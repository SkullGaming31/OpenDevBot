import { createSqliteModel } from '../sqliteModel';

export interface IBankAccount {
	_id?: string;
	userId: string;
	username: string;
	balance: {
		bank: number;
		wallet: number;
	};
	createdAt: Date;
	updatedAt: Date;
}

const BankAccount = createSqliteModel<IBankAccount>('BankAccount', {
	defaults: { balance: { bank: 0, wallet: 0 } },
	timestamps: true,
	unique: [['userId']],
});

export default BankAccount;
