const { Client, Intents } = require('discord.js');

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_PRESENCES,
    Intents.FLAGS.GUILD_WEBHOOKS
  ],
  allowedMentions: [
    {
      parse: [
        'EVERYONE',
        'USERS',
        'ROLES'
      ]
    }
  ],
  partials: ['CHANNEL', 'GUILD_MEMBER', 'GUILD_SCHEDULED_EVENT', 'MESSAGE', 'REACTION', 'USER'],
  presence: {
    activities: [
      {
        name: 'TWITCH-CHAT',
        type: 'STREAMING'
      }
    ],
    afk: false,
  }
});
module.exports = client;