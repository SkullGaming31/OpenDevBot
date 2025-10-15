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
* [ ] auto Timer: sends messages every X amount of time with any interaction, should start timer when the bot starts
* [x] Counters
* [x] Quotes System?
* [x] Viewer Watch Time?
* [x] Virtual Currency System
  * [x] duel
  * [x] dig
  * [x] Heist
  * [x] Gamble
  * [ ] Battle Royale?: Viewers enter a battle royale where the bot randomly eliminates participants until one winner remains.
  * [x] Rock, Paper, Scissors?: Viewers play against the bot by typing their choice. The bot responds with its choice and determines the winner.
  * [ ] Word Scramble?: Provide a scrambled word and let viewers try to unscramble it. The first correct answer wins.
  * [ ] Hangman?: Start a hangman game where viewers guess letters to figure out the word. Display the current state of the word and incorrect guesses in chat
* [x] change channelPoints Message to display only on the console when channelpoints rewardId is not found.
* [x] Que/delay webhooks being sent to avoid being rate limited by the Discord API



3 Migrate higher-risk, multi-user commands: DONE

* duel.ts, heist.ts, loot.ts, shop.ts, gamble.ts — rework to use the adapter/economyService atomic ops. Where operations affect multiple users, use the economyService.transfer or transaction path.

4 Replace purge/add/remove moderation commands: DONE

* addpoints.ts, removepoints.ts, purgeBalance.ts — reimplement using economyService APIs. For purge-all, use a DB operation on BankAccount to zero balances (more efficient).

5 Remove or migrate UserModel.balance usages in chat.ts: DONE

* Adjust user creation to create a BankAccount entry and stop setting balance on UserModel. Optionally keep a migration job to backfill accounts from UserModel.

6 Tests: DONE

* For each migrated command, add unit tests mocking economyService to ensure behavior remains the same.
Add integration tests for critical multi-user flows (transfer/duel/heist) using mongodb-memory-server replica-set or fallback-safe logic as today.

7 Cleanup:

* After migrating all usages, remove balance from UserModel schema and any dependent code.