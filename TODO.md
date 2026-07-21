# TODO List

* [x] Connected auth to account
* [x] Connected ChatClient
* [x] Removed PubSub
* [x] connected to EventSub with websockets
* [x] add commands
  * [x] commands load from there own .ts file
  * [x] convert followage/accountage to years,months,day,hours,minutes,seconds
  * [x] convert uptime to display days,hours,minutes,seconds(24 hour streams)
* [x] add word detection to send commands without prefix
* [x] create channelPoints with userToken to modify the channel points with commands [Hard Coded ChannelPoints]
* [x] Advanced Lurk Command
* [x] auto Timer: sends messages every X amount of time with any interaction, should start timer when the bot starts
* [x] Counters
* [x] Quotes System?
* [x] Viewer Watch Time?
* [x] Virtual Currency System
  * [x] duel
  * [x] dig
  * [x] Heist
  * [x] Gamble
  * [x] Rock, Paper, Scissors?: Viewers play against the bot by typing their choice. The bot responds with its choice and determines the winner.
  * [X] Word Scramble?: Provide a scrambled word and let viewers try to unscramble it. The first correct answer wins.
  * [X] Hangman?: Start a hangman game where viewers guess letters to figure out the word. Display the current state of the word and incorrect guesses in chat
* [x] change channelPoints Message to display only on the console when channelpoints rewardId is not found.
* [x] Que/delay webhooks being sent to avoid being rate limited by the Discord API

## Remaining work

* [ ] Finish the test-fix sweep and make the full test suite (`npm test`) pass deterministically.
* [ ] Remove temporary diagnostic `console.log` lines added during debugging and re-run tests.
* [ ] Harden mirroring logic: avoid upserts with null keys, add guards before mirror writes, and make `MIRROR_TO_USERMODEL` explicitly toggleable (default OFF for migrations).
* [ ] Finalize and validate migration tooling for canonicalizing user IDs (dry-run + `--apply`, batching/limit, backups).
* [ ] Ensure all commands use the correct API: wallet ops via `balanceAdapter` (short-lived/game bets) and bank ops via `economyService` (persistent ops), and update any remaining command code/tests.
* [ ] Add/expand integration tests for transactional flows (heist/replica-set transactions) and outbox/migration scenarios.
* [ ] Fix remaining TypeScript/Jest issues (unused imports like in `src/Commands/Fun/rps.ts`) and run `tsc`/lint to clean up errors.
* [ ] Update docs: `NOTES.txt`, `README.md`, and migration instructions showing `MIRROR_TO_USERMODEL` usage and rollback guidance.
* [ ] Run formatting and prepare a tidy commit/PR with descriptive changes and test results.

