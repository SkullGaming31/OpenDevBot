# OpenDevBot — Core Architecture Code Review by ClaudeAI

Scope: `authProvider.ts`, `chat.ts`, `createApp.ts`, `EventSubEvents.ts`, `index.ts`
Date: 2026-07-13

---

## 🔴 Critical

### 1. `chat.ts:289` — `setInterval` created on every single chat message, never cleared

Inside `commandHandler` (which runs on **every** incoming chat message), there's:

```ts
void setInterval(async () => {
    if (isIntervalRunning) {
        await intervalHandler();
    }
}, intervalDuration);
```

This has no guard flag and no stored handle. Compare this to `periodicSaveIntervalId` and
`socialIntervalId`, which *are* correctly guarded/cleared elsewhere in this same file (e.g. the
`periodicSocialTimerStarted` flag around line 454).

**Impact:** every chat message in every joined channel spins up a brand-new interval that fetches
chatters, checks live status, and credits wallets — and it runs forever. With any real chat
activity this is an unbounded interval leak:
- growing memory use over time
- growing Twitch API call volume (rate-limit risk)
- duplicate/overlapping wallet credits for the same users each interval tick

**This is almost certainly the top production risk right now.**

**Fix direction:** this "periodically credit chatters while live" block shouldn't live inside the
message handler at all. Pull it out into a one-time setup step (same pattern you already used
correctly for the periodic social-message timer), guarded by a module-level flag so it only starts
once per process, and store/clear its interval handle like `periodicSaveIntervalId`.

---

## 🟠 High

### 2. `createApp.ts` — admin token handling

- Token comparisons use plain `!==` (`provided !== token`, `token !== expected`) instead of a
  constant-time comparison. Low real-world risk for a personal bot, but cheap to harden with
  `crypto.timingSafeEqual`.
- The admin token can be supplied via `?admin_token=` query param, and the setup/login tokens via
  `?setup_token=` / `?token=` query params. These end up in server access logs, any reverse-proxy
  logs, and browser history. Recommend dropping query-param support for tokens entirely and
  requiring the header/cookie only.

### 3. `/api/v1/admin/setup` writes directly to `.env` on disk

`fs.writeFileSync` is used to persist `ADMIN_API_TOKEN` whenever the endpoint is hit with a valid
`ADMIN_SETUP_TOKEN`. If that setup token ever leaks, or is left set in a prod `.env` after initial
setup, anyone who finds it gets full admin API access. Confirm `ADMIN_SETUP_TOKEN` is unset in prod
once initial setup is complete — maybe add a startup warning if it's still set alongside
`ENVIRONMENT=prod`.

---

## 🟡 Medium

### 4. Chatter-fetch/crediting logic duplicated in two places

Once as the (broken) interval inside `commandHandler`, and again in the `onJoin` watch-time
interval logic. Worth consolidating into a single periodic service so there's one source of truth
for "credit points every N minutes while live."

### 5. `chat.ts:623-624` — dead code

```ts
if (stream === null) clearInterval(intervalId);
```

This runs right after the function already `return`s earlier when `stream === null` (~line 557),
so this branch can never be reached. Harmless, but confusing — safe to delete.

### 6. `chat.ts` `onJoin` — potential interval leak on reconnect without `part`

If a user rejoins without a `part` event firing first (reconnect edge case), `viewerWatchTimes.set(user, ...)`
overwrites the map entry without clearing the *previous* interval tied to that user — a smaller-scale
version of the same leak pattern as issue #1. Worth clearing any existing interval for `user` before
overwriting the map entry.

### 7. `authProvider.ts` — fragile Twurple SDK fallback chain

`getChatAuthProvider()`'s intent-registration logic (~lines 120–193) tries four different fallback
paths wrapped in nested try/catch to work around Twurple SDK version differences between
`addUserForToken`, `addUser` with options, `addUser`, and `addIntentsToUser`. It works, but it's
fragile — any Twurple upgrade could silently change which path fires and you might not notice until
chat auth breaks. Worth a code comment noting the exact Twurple version this was validated against.

---

## 🟢 Low / cleanup

### 8. `index.ts` — `printEnvironmentVariables()` logs secrets, but is dead code

Not called anywhere in the codebase currently, but if it's ever wired up it will `logger.debug`
every `.env` key/value pair verbatim — including `TWITCH_CLIENT_SECRET`, Discord webhook tokens,
`MONGO_PASS`, `NEXON_API_KEY`, etc. Either delete it, or if you want to keep it for future
debugging, redact any key containing `TOKEN`, `SECRET`, `PASS`, or `KEY` before logging.

### 9. Silent error swallowing in `authProvider.ts`

Multiple `catch (e) { /* ignore */ }` blocks around the SDK-fallback probing in
`getChatAuthProvider()`. Reasonable for probing which SDK method exists, but worth double-checking
none of these are hiding a genuine auth failure in prod — consider at least a `logger.debug` in
each ignored catch so there's a breadcrumb if chat auth ever silently stops working.

---

## Suggested order of attack

1. Fix #1 (interval leak) — this is the one actually degrading the running bot over time.
2. Fix #2/#3 (admin auth hardening) — quick wins, closes real exposure.
3. #4–#7 as time allows — quality-of-life and future-proofing.
4. #8/#9 — cleanup whenever convenient.
