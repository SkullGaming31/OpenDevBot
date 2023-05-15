import { Schema, model } from 'mongoose';

interface IGame extends Document {// Encounter Command
  currentBet: number;
  players: string;
	nextRoundPlayers: string[];
	finalRoundPlayers: string[];
	winner: string;
}

// Define the database schema for the game data
const gameSchema = new Schema<IGame>({
	currentBet: { type: Number, required: true },
	players: { type: String, required: true },
	nextRoundPlayers: { type: [String], required: true },
	finalRoundPlayers: { type: [String], required: true },
	winner: { type: String },
});

// Create a model for the game data
const Game = model<IGame>('Game', gameSchema);

// export the model
export default Game;