const { EventSubListener } = require('@twurple/eventsub');
const { NgrokAdapter } = require('@twurple/eventsub-ngrok');
const { TWITCH_EVENTSUB_SECRET } = require('../config');
const { apiClient } = require('./lib/twitch-api');

const eventSubSecret = TWITCH_EVENTSUB_SECRET;

const eventSubListener = new EventSubListener({
  apiClient,
  adapter: new NgrokAdapter(),
  secret: eventSubSecret,
  logger: { minLevel: 'error' },
  strictHostCheck: true
});

eventSubListener.listen().then(() => console.log('EventSub Listener Started')).catch((err) => console.error(err));
// await eventSubListener.listen().then(() => console.log('Event Listener Started')).catch((err) => console.error(err));

module.exports = eventSubListener;