// Pure, client-safe Monopoly game logic for the board game hub.
// Simplifications from the full ruleset (kept intentionally simple):
//  - No auctions when a player declines to buy (space just stays unowned).
//  - No player-to-player trading yet.
//  - On rolling a 7... n/a (that's Uno). On landing on Chance/Community Chest,
//    a small curated deck is used instead of the full 16-card decks.

export type SpaceType =
  | "go"
  | "property"
  | "railroad"
  | "utility"
  | "tax"
  | "chance"
  | "chest"
  | "jail"
  | "go-to-jail"
  | "free-parking";

export type PropertyColor =
  | "brown"
  | "light-blue"
  | "pink"
  | "orange"
  | "red"
  | "yellow"
  | "green"
  | "dark-blue";

export interface BoardSpace {
  id: number;
  name: string;
  type: SpaceType;
  price?: number;
  color?: PropertyColor;
  /** [base, 1house, 2house, 3house, 4house, hotel] — properties only */
  rent?: number[];
  houseCost?: number;
  taxAmount?: number;
}

export const BOARD: BoardSpace[] = [
  { id: 0, name: "GO", type: "go" },
  { id: 1, name: "Mediterranean Avenue", type: "property", price: 60, color: "brown", rent: [2, 10, 30, 90, 160, 250], houseCost: 50 },
  { id: 2, name: "Community Chest", type: "chest" },
  { id: 3, name: "Baltic Avenue", type: "property", price: 60, color: "brown", rent: [4, 20, 60, 180, 320, 450], houseCost: 50 },
  { id: 4, name: "Income Tax", type: "tax", taxAmount: 200 },
  { id: 5, name: "Reading Railroad", type: "railroad", price: 200 },
  { id: 6, name: "Oriental Avenue", type: "property", price: 100, color: "light-blue", rent: [6, 30, 90, 270, 400, 550], houseCost: 50 },
  { id: 7, name: "Chance", type: "chance" },
  { id: 8, name: "Vermont Avenue", type: "property", price: 100, color: "light-blue", rent: [6, 30, 90, 270, 400, 550], houseCost: 50 },
  { id: 9, name: "Connecticut Avenue", type: "property", price: 120, color: "light-blue", rent: [8, 40, 100, 300, 450, 600], houseCost: 50 },
  { id: 10, name: "Jail", type: "jail" },
  { id: 11, name: "St. Charles Place", type: "property", price: 140, color: "pink", rent: [10, 50, 150, 450, 625, 750], houseCost: 100 },
  { id: 12, name: "Electric Company", type: "utility", price: 150 },
  { id: 13, name: "States Avenue", type: "property", price: 140, color: "pink", rent: [10, 50, 150, 450, 625, 750], houseCost: 100 },
  { id: 14, name: "Virginia Avenue", type: "property", price: 160, color: "pink", rent: [12, 60, 180, 500, 700, 900], houseCost: 100 },
  { id: 15, name: "Pennsylvania Railroad", type: "railroad", price: 200 },
  { id: 16, name: "St. James Place", type: "property", price: 180, color: "orange", rent: [14, 70, 200, 550, 750, 950], houseCost: 100 },
  { id: 17, name: "Community Chest", type: "chest" },
  { id: 18, name: "Tennessee Avenue", type: "property", price: 180, color: "orange", rent: [14, 70, 200, 550, 750, 950], houseCost: 100 },
  { id: 19, name: "New York Avenue", type: "property", price: 200, color: "orange", rent: [16, 80, 220, 600, 800, 1000], houseCost: 100 },
  { id: 20, name: "Free Parking", type: "free-parking" },
  { id: 21, name: "Kentucky Avenue", type: "property", price: 220, color: "red", rent: [18, 90, 250, 700, 875, 1050], houseCost: 150 },
  { id: 22, name: "Chance", type: "chance" },
  { id: 23, name: "Indiana Avenue", type: "property", price: 220, color: "red", rent: [18, 90, 250, 700, 875, 1050], houseCost: 150 },
  { id: 24, name: "Illinois Avenue", type: "property", price: 240, color: "red", rent: [20, 100, 300, 750, 925, 1100], houseCost: 150 },
  { id: 25, name: "B&O Railroad", type: "railroad", price: 200 },
  { id: 26, name: "Atlantic Avenue", type: "property", price: 260, color: "yellow", rent: [22, 110, 330, 800, 975, 1150], houseCost: 150 },
  { id: 27, name: "Ventnor Avenue", type: "property", price: 260, color: "yellow", rent: [22, 110, 330, 800, 975, 1150], houseCost: 150 },
  { id: 28, name: "Water Works", type: "utility", price: 150 },
  { id: 29, name: "Marvin Gardens", type: "property", price: 280, color: "yellow", rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150 },
  { id: 30, name: "Go To Jail", type: "go-to-jail" },
  { id: 31, name: "Pacific Avenue", type: "property", price: 300, color: "green", rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200 },
  { id: 32, name: "North Carolina Avenue", type: "property", price: 300, color: "green", rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200 },
  { id: 33, name: "Community Chest", type: "chest" },
  { id: 34, name: "Pennsylvania Avenue", type: "property", price: 320, color: "green", rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200 },
  { id: 35, name: "Short Line Railroad", type: "railroad", price: 200 },
  { id: 36, name: "Chance", type: "chance" },
  { id: 37, name: "Park Place", type: "property", price: 350, color: "dark-blue", rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200 },
  { id: 38, name: "Luxury Tax", type: "tax", taxAmount: 100 },
  { id: 39, name: "Boardwalk", type: "property", price: 400, color: "dark-blue", rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200 },
];

const RAILROAD_IDS = [5, 15, 25, 35];
const UTILITY_IDS = [12, 28];

export interface PlayerState {
  id: string;
  cash: number;
  position: number;
  inJail: boolean;
  jailTurns: number;
  jailFreeCards: number;
  bankrupt: boolean;
}

export interface PropertyState {
  owner: string | null;
  houses: number; // 0-4, 5 = hotel
  mortgaged: boolean;
}

export type TurnPhase = "pre-roll" | "awaiting-buy" | "post-roll" | "game-over";

export interface MonopolyState {
  players: Record<string, PlayerState>;
  order: string[];
  turnIndex: number;
  properties: Record<number, PropertyState>;
  dice: [number, number] | null;
  doublesStreak: number;
  phase: TurnPhase;
  freeParkingPot: number;
  lastCard: string | null;
  winner: string | null;
}

interface ChanceCard {
  text: string;
  effect: (state: MonopolyState, playerId: string) => MonopolyState;
}

function adjustCash(state: MonopolyState, playerId: string, amount: number): MonopolyState {
  const p = state.players[playerId];
  if (!p) return state;
  return { ...state, players: { ...state.players, [playerId]: { ...p, cash: p.cash + amount } } };
}

function moveTo(state: MonopolyState, playerId: string, dest: number, passGoBonus: boolean): MonopolyState {
  const p = state.players[playerId];
  if (!p) return state;
  const passedGo = passGoBonus && dest < p.position;
  return {
    ...state,
    players: { ...state.players, [playerId]: { ...p, position: dest, cash: p.cash + (passedGo ? 200 : 0) } },
  };
}

function sendToJail(state: MonopolyState, playerId: string): MonopolyState {
  const p = state.players[playerId];
  if (!p) return state;
  return {
    ...state,
    players: { ...state.players, [playerId]: { ...p, position: 10, inJail: true, jailTurns: 0 } },
    phase: "post-roll",
  };
}

function grantJailFreeCard(state: MonopolyState, playerId: string): MonopolyState {
  const p = state.players[playerId];
  if (!p) return state;
  return { ...state, players: { ...state.players, [playerId]: { ...p, jailFreeCards: p.jailFreeCards + 1 } } };
}

const CHANCE_CARDS: ChanceCard[] = [
  { text: "Advance to GO. Collect $200.", effect: (s, pid) => moveTo(s, pid, 0, true) },
  { text: "Bank pays you a dividend of $50.", effect: (s, pid) => adjustCash(s, pid, 50) },
  { text: "Pay poor tax of $15.", effect: (s, pid) => adjustCash(s, pid, -15) },
  { text: "Advance to Illinois Avenue.", effect: (s, pid) => moveTo(s, pid, 24, true) },
  { text: "Take a trip to Boardwalk.", effect: (s, pid) => moveTo(s, pid, 39, false) },
  { text: "Go to Jail.", effect: (s, pid) => sendToJail(s, pid) },
  { text: "Your building loan matures. Collect $150.", effect: (s, pid) => adjustCash(s, pid, 150) },
  { text: "Get out of Jail Free.", effect: (s, pid) => grantJailFreeCard(s, pid) },
];

const CHEST_CARDS: ChanceCard[] = [
  { text: "Advance to GO. Collect $200.", effect: (s, pid) => moveTo(s, pid, 0, true) },
  { text: "Bank error in your favor. Collect $200.", effect: (s, pid) => adjustCash(s, pid, 200) },
  { text: "Doctor's fees. Pay $50.", effect: (s, pid) => adjustCash(s, pid, -50) },
  { text: "You inherit $100.", effect: (s, pid) => adjustCash(s, pid, 100) },
  { text: "Life insurance matures. Collect $100.", effect: (s, pid) => adjustCash(s, pid, 100) },
  { text: "Pay hospital fees of $100.", effect: (s, pid) => adjustCash(s, pid, -100) },
  { text: "Go to Jail.", effect: (s, pid) => sendToJail(s, pid) },
  { text: "Get out of Jail Free.", effect: (s, pid) => grantJailFreeCard(s, pid) },
];

export function initMonopoly(playerIds: string[]): MonopolyState {
  const players: Record<string, PlayerState> = {};
  for (const id of playerIds) {
    players[id] = { id, cash: 1500, position: 0, inJail: false, jailTurns: 0, jailFreeCards: 0, bankrupt: false };
  }
  const properties: Record<number, PropertyState> = {};
  for (const space of BOARD) {
    if (space.type === "property" || space.type === "railroad" || space.type === "utility") {
      properties[space.id] = { owner: null, houses: 0, mortgaged: false };
    }
  }
  return {
    players,
    order: playerIds,
    turnIndex: 0,
    properties,
    dice: null,
    doublesStreak: 0,
    phase: "pre-roll",
    freeParkingPot: 0,
    lastCard: null,
    winner: null,
  };
}

export function currentPlayerId(state: MonopolyState): string {
  return state.order[state.turnIndex]!;
}

export function ownsFullGroup(state: MonopolyState, playerId: string, color: PropertyColor): boolean {
  const groupSpaces = BOARD.filter((s) => s.color === color);
  return groupSpaces.every((s) => state.properties[s.id]?.owner === playerId);
}

export function calculateRent(state: MonopolyState, spaceId: number): number {
  const space = BOARD[spaceId]!;
  const prop = state.properties[spaceId]!;
  if (!prop.owner) return 0;

  if (space.type === "railroad") {
    const ownedCount = RAILROAD_IDS.filter((id) => state.properties[id]?.owner === prop.owner).length;
    return [0, 25, 50, 100, 200][ownedCount] ?? 0;
  }
  if (space.type === "utility") {
    const ownedCount = UTILITY_IDS.filter((id) => state.properties[id]?.owner === prop.owner).length;
    const multiplier = ownedCount >= 2 ? 10 : 4;
    const diceSum = (state.dice?.[0] ?? 0) + (state.dice?.[1] ?? 0);
    return diceSum * multiplier;
  }
  const rentTable = space.rent ?? [0];
  if (prop.houses === 0) {
    const hasMonopoly = ownsFullGroup(state, prop.owner, space.color!);
    return hasMonopoly ? rentTable[0]! * 2 : rentTable[0]!;
  }
  return rentTable[prop.houses] ?? rentTable[rentTable.length - 1]!;
}

function rollTwo(): [number, number] {
  return [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
}

function resolveSpace(state: MonopolyState, playerId: string, spaceId: number): MonopolyState {
  const space = BOARD[spaceId]!;
  let s = state;

  if (space.type === "tax") {
    s = adjustCash(s, playerId, -(space.taxAmount ?? 0));
    return { ...s, freeParkingPot: s.freeParkingPot + (space.taxAmount ?? 0), phase: "post-roll" };
  }
  if (space.type === "go-to-jail") return sendToJail(s, playerId);
  if (space.type === "free-parking") {
    if (s.freeParkingPot > 0) {
      s = adjustCash(s, playerId, s.freeParkingPot);
      s = { ...s, freeParkingPot: 0 };
    }
    return { ...s, phase: "post-roll" };
  }
  if (space.type === "chance" || space.type === "chest") {
    const deck = space.type === "chance" ? CHANCE_CARDS : CHEST_CARDS;
    const card = deck[Math.floor(Math.random() * deck.length)]!;
    s = card.effect(s, playerId);
    return { ...s, lastCard: card.text, phase: "post-roll" };
  }
  if (space.type === "property" || space.type === "railroad" || space.type === "utility") {
    const prop = s.properties[spaceId]!;
    if (!prop.owner) return { ...s, phase: "awaiting-buy" };
    if (prop.owner === playerId || prop.mortgaged) return { ...s, phase: "post-roll" };
    const rent = calculateRent(s, spaceId);
    s = adjustCash(s, playerId, -rent);
    s = adjustCash(s, prop.owner, rent);
    return { ...s, phase: "post-roll" };
  }
  return { ...s, phase: "post-roll" };
}

function movePlayerAndResolve(state: MonopolyState, playerId: string, steps: number): MonopolyState {
  const player = state.players[playerId]!;
  const newPos = (player.position + steps) % 40;
  const passedGo = newPos < player.position;
  const s: MonopolyState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...player, position: newPos, cash: player.cash + (passedGo ? 200 : 0) },
    },
  };
  return resolveSpace(s, playerId, newPos);
}

export function rollDice(state: MonopolyState, playerId: string): MonopolyState | null {
  if (currentPlayerId(state) !== playerId) return null;
  if (state.phase !== "pre-roll") return null;

  const player = state.players[playerId]!;
  const [d1, d2] = rollTwo();
  const isDouble = d1 === d2;

  if (player.inJail) {
    if (isDouble) {
      let s: MonopolyState = { ...state, dice: [d1, d2] };
      s = { ...s, players: { ...s.players, [playerId]: { ...s.players[playerId]!, inJail: false, jailTurns: 0 } } };
      return movePlayerAndResolve(s, playerId, d1 + d2);
    }
    const turns = player.jailTurns + 1;
    if (turns >= 3) {
      let s = adjustCash(state, playerId, -50);
      s = { ...s, players: { ...s.players, [playerId]: { ...s.players[playerId]!, inJail: false, jailTurns: 0 } }, dice: [d1, d2] };
      return movePlayerAndResolve(s, playerId, d1 + d2);
    }
    return {
      ...state,
      dice: [d1, d2],
      players: { ...state.players, [playerId]: { ...player, jailTurns: turns } },
      phase: "post-roll",
    };
  }

  let s: MonopolyState = { ...state, dice: [d1, d2] };
  if (isDouble) {
    const streak = state.doublesStreak + 1;
    if (streak >= 3) {
      return sendToJail({ ...s, doublesStreak: 0 }, playerId);
    }
    s = { ...s, doublesStreak: streak };
  } else {
    s = { ...s, doublesStreak: 0 };
  }
  return movePlayerAndResolve(s, playerId, d1 + d2);
}

export function buyProperty(state: MonopolyState, playerId: string): MonopolyState | null {
  if (currentPlayerId(state) !== playerId || state.phase !== "awaiting-buy") return null;
  const player = state.players[playerId]!;
  const space = BOARD[player.position]!;
  if (!space.price || player.cash < space.price) return null;
  let s = adjustCash(state, playerId, -space.price);
  s = { ...s, properties: { ...s.properties, [space.id]: { owner: playerId, houses: 0, mortgaged: false } }, phase: "post-roll" };
  return s;
}

export function passOnProperty(state: MonopolyState, playerId: string): MonopolyState | null {
  if (currentPlayerId(state) !== playerId || state.phase !== "awaiting-buy") return null;
  return { ...state, phase: "post-roll" };
}

export function payBail(state: MonopolyState, playerId: string): MonopolyState | null {
  if (currentPlayerId(state) !== playerId) return null;
  const player = state.players[playerId]!;
  if (!player.inJail || player.cash < 50) return null;
  let s = adjustCash(state, playerId, -50);
  s = { ...s, players: { ...s.players, [playerId]: { ...s.players[playerId]!, inJail: false, jailTurns: 0 } } };
  return s;
}

export function useJailFreeCard(state: MonopolyState, playerId: string): MonopolyState | null {
  const player = state.players[playerId]!;
  if (!player.inJail || player.jailFreeCards < 1) return null;
  return {
    ...state,
    players: { ...state.players, [playerId]: { ...player, inJail: false, jailTurns: 0, jailFreeCards: player.jailFreeCards - 1 } },
  };
}

export function buildHouse(state: MonopolyState, playerId: string, spaceId: number): MonopolyState | null {
  const space = BOARD[spaceId];
  if (!space || space.type !== "property" || !space.color) return null;
  const prop = state.properties[spaceId]!;
  if (prop.owner !== playerId || prop.mortgaged) return null;
  if (!ownsFullGroup(state, playerId, space.color)) return null;
  if (prop.houses >= 5) return null;
  const groupSpaces = BOARD.filter((s) => s.color === space.color);
  const minHouses = Math.min(...groupSpaces.map((s) => state.properties[s.id]!.houses));
  if (prop.houses > minHouses) return null; // even-build rule
  const player = state.players[playerId]!;
  const cost = space.houseCost ?? 0;
  if (player.cash < cost) return null;
  let s = adjustCash(state, playerId, -cost);
  s = { ...s, properties: { ...s.properties, [spaceId]: { ...prop, houses: prop.houses + 1 } } };
  return s;
}

export function mortgageProperty(state: MonopolyState, playerId: string, spaceId: number): MonopolyState | null {
  const space = BOARD[spaceId];
  const prop = state.properties[spaceId];
  if (!space || !prop || prop.owner !== playerId || prop.mortgaged || prop.houses > 0) return null;
  const value = Math.floor((space.price ?? 0) / 2);
  let s = adjustCash(state, playerId, value);
  s = { ...s, properties: { ...s.properties, [spaceId]: { ...prop, mortgaged: true } } };
  return s;
}

export function unmortgageProperty(state: MonopolyState, playerId: string, spaceId: number): MonopolyState | null {
  const space = BOARD[spaceId];
  const prop = state.properties[spaceId];
  if (!space || !prop || prop.owner !== playerId || !prop.mortgaged) return null;
  const cost = Math.ceil(((space.price ?? 0) / 2) * 1.1);
  const player = state.players[playerId]!;
  if (player.cash < cost) return null;
  let s = adjustCash(state, playerId, -cost);
  s = { ...s, properties: { ...s.properties, [spaceId]: { ...prop, mortgaged: false } } };
  return s;
}

function declareBankruptcy(state: MonopolyState, playerId: string): MonopolyState {
  const properties = { ...state.properties };
  for (const key of Object.keys(properties)) {
    const numId = Number(key);
    if (properties[numId]?.owner === playerId) {
      properties[numId] = { owner: null, houses: 0, mortgaged: false };
    }
  }
  const players = { ...state.players, [playerId]: { ...state.players[playerId]!, bankrupt: true, cash: 0 } };
  const activeIds = state.order.filter((id) => !players[id]?.bankrupt);
  if (activeIds.length <= 1) {
    return { ...state, players, properties, phase: "game-over", winner: activeIds[0] ?? null };
  }
  let nextIndex = state.turnIndex;
  do {
    nextIndex = (nextIndex + 1) % state.order.length;
  } while (players[state.order[nextIndex]!]?.bankrupt);
  return { ...state, players, properties, turnIndex: nextIndex, phase: "pre-roll", dice: null, doublesStreak: 0 };
}

export function endTurn(state: MonopolyState): MonopolyState {
  const playerId = currentPlayerId(state);
  const player = state.players[playerId]!;

  if (player.cash < 0) {
    return declareBankruptcy(state, playerId);
  }

  const activeIds = state.order.filter((id) => !state.players[id]?.bankrupt);
  if (activeIds.length <= 1) {
    return { ...state, phase: "game-over", winner: activeIds[0] ?? null };
  }

  const isDouble = state.dice && state.dice[0] === state.dice[1];
  if (isDouble && !player.inJail && state.phase === "post-roll") {
    return { ...state, phase: "pre-roll", dice: null };
  }

  let nextIndex = state.turnIndex;
  do {
    nextIndex = (nextIndex + 1) % state.order.length;
  } while (state.players[state.order[nextIndex]!]?.bankrupt);

  return { ...state, turnIndex: nextIndex, phase: "pre-roll", dice: null, doublesStreak: 0 };
}
