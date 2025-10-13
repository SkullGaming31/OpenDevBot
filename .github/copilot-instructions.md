The repository is a Twitch chatbot (OpenDevBot) using Twurple for Twitch integration and basic Discord webhooks for notifications.

Quick orientation (read these files first):
- `src/index.ts` — app bootstrap: connects to MongoDB, starts Express server, conditionally starts Twitch EventSub (`ENABLE_EVENTSUB`) and Twitch chat (`ENABLE_CHAT`).
- `src/chat.ts` — IRC chat client: loads commands from `src/Commands`, handles message parsing, cooldowns, moderator/dev-only checks, and registers commands via `registerCommand`.
- `src/EventSubEvents.ts` — EventSub websocket listeners for stream online/offline, hype trains, follows, and other channel events. Sends Discord webhooks via `discord.js` `WebhookClient`.
- `src/auth/authProvider.ts` & `src/api/userApiClient.ts` — Twurple Auth + ApiClient wiring. Tokens are stored in MongoDB (`src/database/models/tokenModel.ts`).
- `src/database/index.ts` — Mongoose connection and DB health logging.

Important patterns & conventions
- Commands are individual modules under `src/Commands/**`. The loader dynamically imports `.ts` files in non-prod and `.js` in prod. Each command exports a default object with at least `execute(channel, user, args, text, msg)` and optional `aliases`, `cooldown`, `moderator`, `devOnly`.
- Environment/Mode flags:
  - `Enviroment` (note misspelling) controls prod vs dev behavior — used widely. Check `.env` for `Enviroment`, `ENABLE_CHAT`, `ENABLE_EVENTSUB`, `PORT`, `MONGO_URI` / `DOCKER_URI`.
  - Watch for both `Env` and `Enviroment` in code — they are used inconsistently.
- Tokens & Auth: Twitch tokens live in Mongo (see `TokenModel`). `authProvider` auto-refreshes tokens and updates the DB on refresh (via `onRefresh`). `openDevBotID` (659523613) is a special user id.
- Webhooks: Discord webhooks are configured via environment variables (e.g., `DEV_DISCORD_TWITCH_ACTIVITY_ID`/TOKEN). `EventSubEvents.ts` and `chat.ts` use `WebhookClient` directly.

Developer workflows (how to run & debug)
- Local dev run: `npm run start` (uses `ts-node` to run `src/index.ts`).
- Development watch: `npm run dev` (nodemon), or `npm run watch` (tsc watch). Production build: `npm run build` + `npm run prod`.
- DB seed / utilities: `npm run seed` and `npm run log` run TypeScript scripts (`seedDatabase.ts`, `logDatabaseData.ts`).

Common troubleshooting notes for agents
- If commands don't load, check `process.env.Enviroment` — loader expects `.ts` when not `prod` and `.js` in `prod`.
- If Twitch API calls fail, ensure tokens exist in Mongo (`tokenModel`) and `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` are set. `authProvider` adds user 659523613 with `chat` scope.
- EventSub issues: EventSub uses websockets via `@twurple/eventsub-ws` — ensure `ENABLE_EVENTSUB` is set and the token entries in DB map to broadcasters.
- Discord webhook failures: check `DEV_DISCORD_*` env vars and that `WebhookClient` id/token are present.

Files to reference when making changes
- Command examples: `src/Commands/Fun/*` and `src/Commands/Information/*` show typical command shapes and DB interactions.
- DB models: `src/database/models/*` for schema conventions (users, tokens, counters, events).
- Utility helpers: `src/util/util.ts` and `src/util/constants.ts` for shared timeouts, webhook IDs, and environment helpers.

Edge cases agents must respect
- Inconsistent env var names (`Enviroment` vs `Env`) and occasional hard-coded ids (e.g., `1155035316` for skullgaminghq). Search before renaming.
- Code mixes sync FS imports and dynamic `import()` for commands. Preserve dynamic import behavior when refactoring.
- Side effects at startup: `src/index.ts` deletes the `injuries` collection on each start. Do not remove without discussing with maintainers.

Edit guidance
- Small changes: update relevant command file under `src/Commands` and preserve exported shape (`default` with `execute`).
- Adding a new command: create a `.ts` file under the appropriate subfolder, export default object { name?, aliases?, cooldown?, moderator?, devOnly?, execute(...) }.
- Large changes (auth, EventSub): run local startup with `ENABLE_EVENTSUB` and `ENABLE_CHAT` toggles and verify DB tokens exist. Add migrations/tests for token schema changes.

If anything in these notes is unclear or you'd like the agent to expand any section (run steps, env var list, or sample command template), say which part and I'll iterate.
