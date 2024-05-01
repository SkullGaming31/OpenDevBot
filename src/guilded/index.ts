import { Client, ClientOptions } from 'guilded.js';

export class CustomGuildedClient extends Client {
	constructor(token: string, options?: ClientOptions) {
		const defaultOptions: ClientOptions = {
			token,
			cache: {
				cacheMessages: true, 
				cacheSocialLinks: true,
				cacheCalendars: true,
				cacheCalendarsRsvps: true,
				cacheChannels: true,
				cacheForumTopics: true,
				cacheMemberBans: true,
				cacheMessageReactions: true,
				cacheServers: true,
				cacheWebhooks: true,
				fetchMessageAuthorOnCreate: true,
				removeCalendarRsvpOnDelete: true,
				removeCalendarsOnDelete: true,
				removeChannelOnDelete: true,
				removeMemberBanOnUnban: true,
				removeMemberOnLeave: true
			}
		};

		super({ ...defaultOptions, ...options });
	}
}