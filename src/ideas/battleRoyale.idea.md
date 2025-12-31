# Battle Royale Twitch Chat Game Idea

this should all be done in typescript using markdown code blocks
this is for a Battle Royale twitch chat game where viewers will join the BR
all players have a health of 100 at the start
after each round a random event will occur that can either damage or heal players
you will be awarded points(Virtual Currency) and XP based on your performance in each round

```ts
interface Player {
  name: string;
  health: number;
  inventory: string[];
  level: number;
  xp: number;
  coins: number;
}

const player: Player = {
  name: "Player1",
  health: 100,
  inventory: [],
  level: 0,
  xp: 0,
  coins: 0
};
```

we need a list of items that could help the player during the game

```ts
/** @type {{name: string, effect: string, amount: number}[]} */
const items = [
  { name: "Adrenaline Pen", effect: "heal", amount: 30 },
  { name: "Industrial Medkit", effect: "heal", amount: 75 },
  { name: "Small Battery Cell", effect: "energy", amount: 15 },
  { name: "ARC Core Fragment", effect: "xp", amount: 250 },
  { name: "Refined Scrap", effect: "currency", amount: 50 },
  { name: "Electronic Components", effect: "crafting_skill", amount: 5 },
  { name: "Fusion Welder", effect: "armor_repair", amount: 40 },
  { name: "Stim-Shot", effect: "stamina", amount: 20 },
  { name: "Encrypted Data Drive", effect: "xp", amount: 100 },
  { name: "High-Grade Polymer", effect: "defense", amount: 10 },
  { name: "Coolant Canister", effect: "heat_reduction", amount: 25 },
  { name: "Nano-Repair Swarm", effect: "heal", amount: 100 }
];
```

after each round, a random event occurs, each event will be a randomly generated number that will either damage or heal the player

```ts
amount = some random number between 5 and 30 using crypto

const events = [
  { type: "damage", amount: 20, description: "You were hit by an arrow!" },
  { type: "heal", amount: 15, description: "You found a medkit!" },
  { type: "damage", amount: 10, description: "You fell into a trap!" },
  { type: "heal", amount: 25, description: "You drank a health potion!" },
];
function getRandomEvent() {
  const event = events[Math.floor(Math.random() * events.length)];
  const randomAmount = Math.floor(Math.random() * (30 - 5 + 1)) + 5;
  return { ...event, amount: randomAmount };
}

function applyEvent(player, event) {
  if (event.type === "damage") {
    player.health -= event.amount;
    if (player.health < 0) player.health = 0;
  } else if (event.type === "heal") {
    player.health += event.amount;
    if (player.health > 100) player.health = 100;
  }
  return player;
}

const event = getRandomEvent();
console.log(`Event: ${event.description} Amount: ${event.amount}`);
const updatedPlayer = applyEvent(player, event);
console.log(`Player Health: ${updatedPlayer.health}`);
```

after each round, players will be awarded points and XP based on their performance
if a player survives the round, they get 10 points and 20 XP
if a player is eliminated, they lose X(randomly generated) amount of XP, but cannot go below 0 XP

```ts
const level = {
  0: 0
  1: 100,
  2: 250,
  3: 500,
  4: 1000,
  5: 2000,
  6: 3500,
  7: 5000,
  8: 7500,
  9: 10000,
  10: 15000,
};

function getLevel(xp) {
  let level = 0;
  for (const [lvl, reqXp] of Object.entries(level)) {
    if (xp >= reqXp) {
      level = parseInt(lvl);
    } else {
      break;
    }
  }
  return level;
}
```

```ts
function awardPointsAndXP(player, survived) {
  if (survived) {
    player.xp += 20;
    return { points: 10, xpGained: 20 };
  } else {
    const xpLoss = Math.floor(Math.random() * 21); // Random loss between 0 and 20
    player.xp -= xpLoss;
    if (player.xp < 0) player.xp = 0;
    return { points: 0, xpLost: xpLoss };
  }
}

const survived = updatedPlayer.health > 0;
const result = awardPointsAndXP(updatedPlayer, survived);
if (survived) {
  console.log(`Survived! Gained ${result.points} points and ${result.xpGained} XP.`);
} else {
  console.log(`Eliminated! Lost ${result.xpLost} XP.`);
}
```

set the player object if the user gains a level

```ts
const newLevel = getLevel(updatedPlayer.xp);
if (newLevel > updatedPlayer.level) {
  updatedPlayer.level = newLevel;
  console.log(`Congratulations! You've reached level ${newLevel}!`);
}
```