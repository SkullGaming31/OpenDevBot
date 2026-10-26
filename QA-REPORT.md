# QA Report

**Date:** 2026-10-26
**Scope:** Full Electron startup using disposable user data, local SQLite and API health, dashboard loading, outbound-network safety, the Jest suite, and TypeScript typecheck.

## Checks and results

| Check | Command / setup | Result |
|---|---|---|
| Initial full Jest run under strict guard | `npm test`, with `ENVIRONMENT=test`, `DISCORD_WEBHOOK_DRY_RUN=true`, `ENABLE_CHAT=false`, `ENABLE_EVENTSUB=false`, and a temporary `NODE_OPTIONS=--require=<temp>\preload-guard.cjs`. The strict guard terminated a process on a non-loopback attempt. | **GUARD-STOPPED** — 71/72 suites and 233 tests passed; the retry-worker suite hit the guard and Jest reported worker child-process exceptions. No network I/O was allowed. |
| Focused retry-worker reproduction | `npm test -- --runInBand src/__tests__/retryWorker.test.ts` under the same strict guard. | **GUARD-STOPPED** — exited 88 at a blocked TLS connection before network I/O. This exposed an unmocked Twitch API call in the test path; see Finding 1. |
| Full Jest suite with reject-only network guard | `npm test`, with the same environment and dotenv/file-access protections; non-loopback socket attempts were rejected before I/O instead of terminating Jest workers. | **PASS** — 72 suites, 236 tests. Guard logs recorded blocked attempts from tests; none reached the network. |
| Typecheck | `npm run typecheck` with `ENVIRONMENT=test`, `DISCORD_WEBHOOK_DRY_RUN=true`, `ENABLE_CHAT=false`, `ENABLE_EVENTSUB=false`, and the temporary preload guard. | **PASS** — no TypeScript diagnostics. |
| Actual Electron application startup | Launched `node_modules/electron/dist/electron.exe` with `dist-electron/electron/main.js`, a fresh temporary `--user-data-dir`, API port **50678**, remote-debugging port **50679**, and the strict temporary preload guard. Environment explicitly set `ENVIRONMENT=test`, `DISCORD_WEBHOOK_DRY_RUN=true`, `ENABLE_CHAT=false`, `ENABLE_EVENTSUB=false`; credential-like environment variables and proxy variables were cleared. Chromium used `--no-proxy-server`, `--disable-background-networking`, `--disable-component-update`, `--disable-sync`, and `--host-resolver-rules="MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1"`. | **PASS** — Electron remained running through verification. `GET http://127.0.0.1:50678/health` returned `{"status":"ok","db":true}`. The remote-debugging target reported title **OpenDevBot — Control Room** and URL `file:///D:/Corey/developments/OpenDevBot/public/admin/dashboard.html`. |
| Disposable SQLite validation | Opened `<temp>\userdata\opendevbot.sqlite` read-only with `better-sqlite3`; ran `PRAGMA integrity_check`. | **PASS** — file existed (4096 bytes), integrity result `ok`; a health response also confirmed the application had opened the database. No records were seeded. |
| Electron outbound guard | Temporary Node preload made `dotenv.config()` a no-op, denied dotenv-file reads, cleared credential-like environment variables, mocked `WebhookClient.send()`, and terminated on non-loopback Node socket/DNS/fetch attempts. Chromium was constrained by the host resolver and no-proxy/background-network flags above. | **PASS** — guard initialized; **0 blocked outbound attempts were recorded for Electron**. The process and its child processes were stopped after checks. |
| OS firewall deny rule | Attempted `netsh advfirewall firewall add rule name="OpenDevBot-QA-Temporary-Outbound-Deny" dir=out action=block program="D:\Corey\developments\OpenDevBot\node_modules\electron\dist\electron.exe" enable=yes profile=any`. | **NOT APPLIED** — Windows reported that elevation is required. The Electron run therefore used the process preload guard plus Chromium resolver/network restrictions rather than an OS firewall rule. |

The Electron launch command used:

```text
electron.exe --user-data-dir=<temp>\userdata --remote-debugging-port=50679 --disable-background-networking --disable-component-update --disable-sync --no-proxy-server --host-resolver-rules="MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1" --log-level=0 dist-electron/electron/main.js
```

Only a newly created temporary profile/database was used. No real user data or live Twitch/Discord integration was used. The checked-in/generated Electron main artifact was used as-is; no build output or application code was changed.

## Post-fix verification

| Check | Command | Result |
|---|---|---|
| Focused retry-worker tests | `npm test -- --runInBand src/__tests__/retryWorker.test.ts` | **PASS** — 1 suite, 3 tests. Axios is mocked and returns an empty dummy subscription list, so the test does not contact Twitch. |
| Full Jest suite | `npm test -- --runInBand` | **PASS** — 72 suites, 236 tests. |
| Typecheck | `npm run typecheck` | **PASS** — no TypeScript diagnostics. |

## Findings

### 1. Retry-worker tests attempt an unmocked Twitch API request — Medium (Resolved)

- **Original reproduction:** Run `src/__tests__/retryWorker.test.ts` in-band with `ENVIRONMENT=test` and a preload network guard that blocks non-loopback sockets. The strict guard recorded a blocked TLS attempt and stopped the test process with exit code 88 before network I/O. With the reject-only version of the same guard, the full suite completed.
- **Expected:** The unit test stubs the Twitch-related work and makes no external request.
- **Original actual behavior:** In the test case “succeeds when subscription appears after targeted create,” a token fixture was supplied and `createSubscriptionsForAuthUser` was mocked, but the subsequent request in `attemptResubscribe` was not mocked. It called `https://api.twitch.tv/helix/eventsub/subscriptions`; the production function catches request errors, so the test could still pass after the guard rejected the connection.
- **Fix:** `src/__tests__/retryWorker.test.ts` now mocks Axios and supplies an empty dummy subscription response for each test. The retry-worker logic remains exercised, while the unit test cannot make the Twitch request. Production behavior is unchanged.
- **Verification:** The focused test, full Jest suite, and typecheck all pass; see Post-fix verification above.
- **References:** `src/__tests__/retryWorker.test.ts:45-52`; `src/EventSub/retryWorker.ts:28-38`.

No external network I/O occurred during this QA pass. The Electron-specific guard recorded no blocked outbound attempts. The blocked TLS attempts were observed in the Jest retry-worker path and were stopped before network I/O.

## Limitations

- An OS-level outbound firewall rule could not be installed because this session was not elevated. Electron process-level Node guards and Chromium hostname/network restrictions were active during the full-app check.
- The dashboard’s externally hosted Vue and font resources were not fetched because external host resolution was denied. The local dashboard document itself loaded and was visible as an Electron debugging target with the expected title and file URL; remote-dependent UI behavior was not assessed.
- The existing compiled Electron artifact was launched, but not rebuilt. The working tree already contained unrelated modifications before this pass.
- The disposable database was verified empty and healthy; no application records or fixtures were needed for the startup/health checks.
- No live Twitch/Discord calls, webhook deliveries, or production data were exercised.

## Conclusion

The actual Electron app booted with isolated user data, opened SQLite, served a healthy local API, and loaded the local dashboard surface. The retry-worker test isolation defect has been fixed by mocking Axios with dummy data. The focused test, all 72 Jest suites (236 tests), and typecheck pass after the fix.
