import { PrivateMessage } from '@twurple/chat/lib';

export interface IDadJoke {
	id: string;
	joke: string;
	status: number;
}

export interface Command {
  name: string;
  description: string;
  usage: string;
  aliases?: string[];
  execute: (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => void;
}

export interface LurkMessage {
  userId: string;
  displayName: string;
  message: string;
}