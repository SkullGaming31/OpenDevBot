import { PrivateMessage } from '@twurple/chat/lib';

export interface IDadJoke {
	id: string;
	joke: string;
	status: number;
}

export interface Command {
  name: string; // The name of the command (e.g. 'ping')
  description: string; // A brief description of what the command does
  usage: string; // A usage example of the command (e.g. '!mod shoutout [name]')
  execute: (channel: string, user: string, message: string, msg: PrivateMessage) => Promise<void>; // A function that will be called when the command is executed
}

export interface LurkMessage {
  userId: string;
  displayName: string;
  message: string;
}