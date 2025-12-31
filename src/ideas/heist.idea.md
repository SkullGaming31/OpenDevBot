heist/ 
├─ heist.command.ts // !heist command only 
├─ heist.state.ts // participants, cooldowns, flags 
├─ heist.injuries.ts // injury logic + DB 
├─ heist.loot.ts // loot + success rate 
├─ heist.bank.ts // bank-specific logic 
├─ heist.join.ts // !join listener

heist.state.ts

Single source of truth (no logic)
```ts
export const participants = new Set<string>();
export let isHeistInProgress = false;
export let betAmount = 0;

export const bankCooldowns = new Map<string, number>();
export const BANK_COOLDOWN_MS = 20 * 60 * 1000;
```
Only state. No Twitch, no DB, no math.

**heist.command.ts**

Starts a heist

Responsibilities:

- parse args

- validate zone + bet limits

- check cooldowns

- debit starter

- open join window

- call runHeist()

Does NOT:

- calculate loot

- handle injuries

- touch bank accounts directly

<h1>heist.join.ts</h1>

Listener only:
```ts
chatClient.onMessage(...)
```

Responsibilities:

- listen for !join

- injury check

- debit joiner

- add to participants

- No timers, no results.

<h1>heist.loot.ts</h1>

<h4>Pure logic (no Twitch, no DB)</h4>

exports:
```ts
calculateSuccessRate(...)
calculateLoot(...)
```
No side effects.

<h1>heist.injuries.ts</h1>

<h4>All injury logic + Mongo</h4>

Exports:
```ts
hasActiveInjury(user)
assignInjury(user)
saveInjuries()
clearInjury(user)
```
No heist flow control.

<h1>heist.bank.ts</h1>
<h4>Bank-only behavior</h4>

Exports:
```ts
canRunBank(channelId)
runBankHeist(amount, participants)
setBankCooldown(channelId)
```
Contains:

- donor selection

- transactions

- masking

- cooldown set

- No chat messages.

```ts
!heist
 └─ command.ts
     ├─ state checks
     ├─ start timer
     ├─ wait
     └─ resolveHeist()
          ├─ loot OR bank
          ├─ injuries
          ├─ payouts
          └─ cleanup state
```

Key rules (you’re currently violating some)

- No listeners inside command files

- No global mutable arrays → use Set

- Bank logic never touches chat

- State file has zero imports