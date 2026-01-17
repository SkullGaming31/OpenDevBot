import { Command } from '../interfaces/Command';

// A minimal shape for a channel editor object. Adjust as needed if you want
// more properties from the Twurple types (e.g. HelixUser).
export type ChannelEditor = {
	userId?: string;
	userName?: string;
	displayName?: string;
};

export function parseCommandText(text: string): { args: string[]; commandName?: string } {
	const args = text.slice(1).split(' ');
	const commandName = args.shift()?.toLowerCase();
	return { args, commandName };
}

export function getCooldownRemaining(lastExecuted: number | undefined, cooldownMs: number, nowMs: number): number {
	if (!lastExecuted || cooldownMs <= 0) return 0;
	const remainingSeconds = Math.ceil((lastExecuted + cooldownMs - nowMs) / 1000);
	return remainingSeconds > 0 ? remainingSeconds : 0;
}

export function checkCommandPermission(
	command: Command,
	isModerator: boolean,
	isBroadcaster: boolean,
	isEditor: boolean,
	msgChannelId?: string | null
): { allowed: boolean; reason?: 'devOnly' | 'moderator' } {
	const isStaff = isModerator || isBroadcaster || isEditor;
	if (command.moderator && !isStaff) return { allowed: false, reason: 'moderator' };
	// Allow devOnly commands in the developer channel `canadiendragon` by id or name.
	const normalizedChannel = String(msgChannelId || '').toLowerCase().replace(/^#/, '');
	const isDevChannel = normalizedChannel === '31124455' || normalizedChannel === 'canadiendragon';
	if (command.devOnly && !isDevChannel && !(isBroadcaster || isModerator)) return { allowed: false, reason: 'devOnly' };
	if (msgChannelId === '31124455' && command.moderator && !isStaff) return { allowed: false, reason: 'moderator' };
	return { allowed: true };
}

export function isUserEditor(channelEditors: ChannelEditor[], userId: string): boolean {
	// Typing `e` as ChannelEditor makes the editor properties show up in
	// your editor/IDE when hovering over `e` in the callback.
	return Array.isArray(channelEditors) ? channelEditors.some((e: ChannelEditor) => e?.userId === userId) : false;
}
