import { Document, Schema, model } from 'mongoose';

export interface User extends Document {
  id: string;
  username: string;
  balance?: number;
  lastBegTime?: Date;
  challengedUser?: string;
  duelChallengeAccepted?: boolean;
  inventory?: string[]
}

const userSchema = new Schema<User>({
	id: { type: String, required: true, unique: true },
	username: { type: String },
	balance: { type: Number, default: 0 },
	lastBegTime: { type: Date, default: new Date(0) },
	challengedUser: { type: String },
	duelChallengeAccepted: { type: Boolean },
	inventory: { type: [String] }// Item Storage
});

export const UserModel = model<User>('Users', userSchema);

export default UserModel;

// export const createUsersTableQuery = `
//   CREATE TABLE IF NOT EXISTS Users (
//     id VARCHAR(255),
//     username VARCHAR(255) NOT NULL,
//     balance INT DEFAULT 0,
//     lastBegTime DATETIME DEFAULT '1970-01-01 00:00:00',
//     challengedUser VARCHAR(255),
//     duelChallengeAccepted BOOLEAN,
//     inventory JSON,
//     PRIMARY KEY (id),
//     UNIQUE KEY (username)
//   )
// `;

// export default createUsersTableQuery;