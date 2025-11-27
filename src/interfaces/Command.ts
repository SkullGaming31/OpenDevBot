import { ChatMessage } from '@twurple/chat/lib';

export interface Command {
  name: string;
  description: string;
  usage?: string;
  aliases?: string[];
  moderator?: boolean;
  devOnly?: boolean;
  cooldown?: number; // in seconds
  lastExecuted?: number;
  execute: (channel: string, user: string, args: string[], text: string, msg: ChatMessage) => void;
}