# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### 2025-10-13 — Summary of work

This entry documents the development work performed on October 13, 2025. The changes were focused on improving authentication, chat connectivity, EventSub resilience, and adding unit tests to validate the recent fixes.

- Tests
  - Added Jest tests under `src/__tests__/`:
    - `authProvider.test.ts` — tests for `getAuthProvider()` and `getChatAuthProvider()` including token preloading and fallback behavior when registering chat intents.
    - `createAppCallback.test.ts` — verifies OAuth callback exchanges code with Twitch and persists tokens to the database (axios and TokenModel mocked).
    - `chatHelpers.test.ts` — tests `getUsernamesFromDatabase()` success and failure paths.
  - Ensured tests run without requiring a live MongoDB or Twitch by mocking the TokenModel and axios where appropriate.

- Authentication and Chat
  - Created a chat-focused auth provider `getChatAuthProvider()` that loads the bot token from the DB and attempts to register the `chat` intent for the bot account so `ChatClient` connects as the bot.
  - Implemented multiple fallbacks to register the chat intent (overloads / addUser variants) to accommodate different versions of Twurple.
  - Added developer-only forced mapping of internal provider intent maps as a temporary workaround to advertise the `chat` intent for the bot when the SDK surface differs.
  - Persisted refreshed tokens back to MongoDB via `authProvider.onRefresh` handlers.

- OAuth / createApp
  - Improved the OAuth callback in `src/util/createApp.ts`:
    - Normalizes returned scopes (handles array or space-separated string).
    - Logs token response and user lookup details for easier debugging.
    - Persists the token document with `obtainmentTimestamp` stored in seconds.
    - Adds an alias redirect route `/api/v1/auth/twitch` for backward compatibility.

- EventSub
  - Began refactoring EventSub subscription registration to defer subscription creation until the websocket listener is started and ready.
  - Added scaffolding for restart/retry logic to reduce repeated 400 errors from the Twitch EventSub API when websocket sessions are not available.

- Chat and Command Handling
  - Added debug logging around incoming chat messages, raw command parsing, commandName extraction, and whether a command was found.
  - Slight rework of command loader to populate `commands` with module exports and register aliases.

- Misc
  - Small developer convenience and debugging prints were added across auth provider and chat client to surface intent mappings and token loading at startup.

### How to run tests

Run the project's tests locally:

```powershell
npm install
npm test
```

The unit tests use mocks for axios and the database models so they do not require a live Twitch or MongoDB instance.

---

For additional historical changelog entries, move them under new dated headings following the same format.
