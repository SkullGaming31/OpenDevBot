The repository is a Twitch chatbot (OpenDevBot) using Twurple for Twitch integration and basic Discord webhooks for notifications.
# Copilot / AI Agent Quick Guide — OpenDevBot

This repo is a Twitch chatbot built on Twurple with Discord webhook notifications. The notes below focus on patterns and workflows an AI coding agent needs to be productive quickly.

**Big picture**
- `src/index.ts`: app bootstrap — opens the SQLite database, starts Express, and conditionally starts EventSub and chat based on env flags.
- `src/chat.ts`: IRC/chat client and command loader (dynamic imports). Commands live in `src/Commands/**`.
- `src/EventSubEvents.ts`: EventSub websocket listeners and Discord webhook sends via `discord.js` `WebhookClient`.
- `src/auth/authProvider.ts` + `src/api/userApiClient.ts`: Twurple auth wiring. Tokens live in SQLite (`src/database/models/tokenModel.ts`).

**Key conventions (project-specific)**
- Commands are modules under `src/Commands/**`. Each default-exported object must include `execute(channel, user, args, text, msg)`. Optional keys: `aliases`, `cooldown`, `moderator`, `devOnly`.
- Loader chooses `.ts` in dev and `.js` in prod — do not rename or move files without adjusting loader logic.
- Environment flag misspelling: `ENVIRONMENT` (and sometimes `Env`) controls prod/dev behavior. Also use `ENABLE_CHAT` and `ENABLE_EVENTSUB` toggles.
- Tokens: Twitch tokens are stored in SQLite; `authProvider` refreshes tokens and updates the database via `onRefresh`.

**Dev / run workflows**
- Start (dev): `npm run start` (uses `ts-node` to run `src/index.ts`).
- Watch / dev iterate: `npm run dev` (nodemon) or `npm run watch` (tsc watch).
- Production: `npm run build` then `npm run prod`.
- Tests: run the test suite with `npm test` (Jest). Individual tests live under `src/__tests__` and top-level `__tests__`.
- DB helpers: `npm run seed`, `npm run log` (run TypeScript scripts that seed or log DB data).

**Integration points & important files**
- Twitch auth & API: `src/auth/authProvider.ts`, `src/api/userApiClient.ts`.
- DB connection: `src/database/sqliteConnection.ts` and models in `src/database/models/*` (see `tokenModel.ts`).
- Commands: `src/Commands/*` (examples in `Fun` and `Information`).
- Webhook sending: `src/EventSubEvents.ts` and `src/chat.ts` (uses env vars like `DEV_DISCORD_*`).

**Gotchas & rules to preserve**
- Preserve the injury cleanup behavior in `src/index.ts`; it removes all or expired injuries from SQLite according to configuration.
- Preserve dynamic `import()` behavior for commands (mix of sync and dynamic imports exists).
- Respect the `ENVIRONMENT` misspelling and search the repo before renaming env vars.
- Be careful with hard-coded IDs (e.g., `openDevBotID` 659523613 and broadcaster ids like `31124455`).

**How to add or edit a command (example)**
1. Create `src/Commands/<Category>/myCommand.ts`.
2. Export default object:

```ts
export default {
  aliases: ['alias'],
  cooldown: 5,
  moderator: false,
  devOnly: false,
  async execute(channel, user, args, text, msg) {
    // implementation
  }
}
```

**Testing & debugging tips**
- If commands fail to load, confirm `process.env.ENVIRONMENT` value and file extension expectations.
- If Twitch API calls fail, check that tokens are present in the `tokenModel` collection and `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` are set.
- For EventSub problems, ensure `ENABLE_EVENTSUB` is set and DB token entries map to broadcasters.

If you want, I can expand any of these sections (env vars list, sample .env, example command + test) — tell me which part to expand.

**EventSub & Token Notes (recent changes)**
- **Persistent EventSub listener:** The code now prefers a single persistent `EventSubWsListener` (see `getEventSubs()` in `src/EventSubEvents.ts`) to avoid creating many short-lived websocket transports and hitting Twitch limits.
- **Avoid duplicate subscriptions:** `createSubscriptionsForAuthUser` queries both the local DB and Twitch Helix (`/eventsub/subscriptions`) to skip creating subscriptions that already exist; subscription writes use `upsert` to avoid E11000 race errors.
- **Subscription storage:** Subscriptions are persisted via `SubscriptionModel` in `src/database/models/eventSubscriptions.ts`.
- **Retry manager:** The retry logic (`src/EventSub/retryManager.ts`) uses atomic SQLite updates to avoid duplicate retry records under concurrent runs.
- **Token storage & auth provider:** Twitch tokens are stored through `TokenModel` (`src/database/models/tokenModel.ts`). `getAuthProvider()` and `getChatAuthProvider()` load tokens and persist refreshed tokens via `onRefresh`.
- **.env highlights:** Keep `ENVIRONMENT` (intentional misspelling), `ENABLE_EVENTSUB`, `ENABLE_CHAT`, `SQLITE_DB_PATH`, and `TWITCH_EVENTSUB_SECRET` in mind — they materially affect startup behavior.
- **Database:** Application data is stored in SQLite. Set `SQLITE_DB_PATH` to override the default database file location.
- **Tests:** The test suite mocks `TokenModel` and `SubscriptionModel`; tests avoid touching real Twitch APIs.
- **Secrets:** Never print or commit full tokens. If a secret is exposed, rotate it immediately and replace the stored DB entry.
