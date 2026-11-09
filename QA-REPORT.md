# QA Report

**Date:** 2026-11-09

**Scope:** Project-wide QA, including automated tests, standalone admin access, a Windows application smoke test, and an authorized live Discord notification.

## Finding

### High: Standalone admin endpoints can be accessed without authentication — Resolved

When `ADMIN_API_TOKEN` is unset, the standalone server can bind to all interfaces while the admin middleware permits requests without a token. The QA agent reproduced this with an isolated server: an unauthenticated `GET /api/v1/admin/status` returned **200**. With a dummy admin token configured, the same request returned **401**.

The middleware also protects state-changing admin endpoints. Remote reachability depends on the network and firewall configuration and was not tested.

- **Expected:** Token-free admin access is limited to the local Electron context, or the standalone server requires authentication.
- **References:** `src/index.ts:149`, `src/util/createApp.ts:90`
- **Fix:** Standalone admin endpoints now return 503 when no admin token is configured. Electron uses a private, randomly generated session token when no persistent token is configured; the local proxy supplies it without exposing it to the renderer.
- **Status:** Resolved and verified locally.

## Post-fix verification

| Check | Command or setup | Result |
|---|---|---|
| Full Jest suite | `npm test -- --runInBand --silent` | **PASS** — 84 suites, 343 tests. |
| TypeScript | `npm run typecheck` | **PASS**. |
| Admin security lint | `npx eslint src\util\createApp.ts electron\main.ts electron\adminProxy.ts` | **PASS**. |
| Windows release | Isolated Electron build, release-contents check and unpacked-app smoke test | **PASS** — unauthenticated admin access returned 401, while the dashboard proxy accessed the admin page using the private session token. |

## Checks and results

| Check | Command or setup | Result |
|---|---|---|
| Full Jest suite | `node ./node_modules/jest/bin/jest.js --runInBand --silent --coverage=false` from an isolated project copy | **PASS** — 82 suites, 334 tests. |
| TypeScript | `npm run typecheck` | **PASS**. |
| Electron TypeScript | `node ./node_modules/typescript/bin/tsc -p electron/tsconfig.json --noEmit` | **PASS**. |
| Release contents | `node scripts/check-release-contents.js` | **PASS**. |
| Windows application | Existing packaged app run from a temporary copy with an isolated profile | **PASS** — SQLite health, dashboard and logs rendering, and admin assets. Launch from the original directory was blocked by its Windows ACL. |
| Discord webhook | One authorized test notification through the application's webhook queue with in-memory SQLite | **PASS**. |
| Standalone admin authentication | Isolated server tested with and without a dummy admin token | **FINDING** — unauthenticated access was allowed when the token was unset. |

## Limitations

- Live Twitch and EventSub flows were not started; credential refresh or subscription creation could exceed the authorized actions. No Twitch traffic was sent.
- The packaged artifact was not rebuilt for this QA run and predates the current EventSub changes.
- UI coverage was partial. Live integrations and all project behaviors were not exhaustively tested.
- `.env` was not modified. The existing database and pre-existing source changes were preserved.

## Conclusion

The standalone admin authentication finding is fixed and verified locally. The earlier automated checks, existing packaged-app smoke test, and authorized Discord delivery also passed.
