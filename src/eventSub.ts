import { EventSubWsListener } from '@twurple/eventsub-ws';
import { getUserApi } from './api/userApiClient';

export async function getEventSubs(): Promise<EventSubWsListener> {
	const userApiClient = await getUserApi();
	const eventSubListener = new EventSubWsListener({ apiClient: userApiClient, logger: { minLevel: 'error' } });
	eventSubListener.start();

	return eventSubListener;
}