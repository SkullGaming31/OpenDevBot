import { PrivateMessage } from '@twurple/chat/lib';

export interface IDadJoke {
	id: string;
	joke: string;
	status: number;
}

export interface Command {
  name: string;
  description: string;
  permissions?: ('broadcaster' | 'moderator' | 'artist' | 'subscriber' | 'founder' | 'vip')[]; // add the permissions property
  usage?: string;
  aliases?: string[];
  cooldown?: number; // cooldown property in milliseconds
  lastExecuted?: number; // store the timestamp of the last execution
  execute: (channel: string, user: string, args: string[], text: string, msg: PrivateMessage) => void;
}