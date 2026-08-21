// Pure Monopoly game logic with per-game shuffled card decks.

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

const RR = [5, 15, 25, 35];
const UT = [12, 28];

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
  houses: number;
  mortgaged: boolean;
}

export type TurnPhase = "pre-roll" | "awaiting-buy" | "post-roll" | "game-over";

export interface PendingTrade {
  id: string;
  from: string;
  to: string;
  offerCash: number;
  requestCash: number;
  offerProperties: number[];
  requestProperties: number[];
}

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
  chanceDeck: number[];
  chestDeck: number[];
  pendingTrade: PendingTrade | null;
}

type Card = {
  text: string;
  effect: (s: MonopolyState, p: string) => MonopolyState;
};

// --- Helper functions ---

const cash = (s: MonopolyState, p: string, n: number): MonopolyState => ({
  ...s,
  players: {
    ...s.players,
    [p]: { ...s.players[p]!, cash: s.players[p]!.cash + n },
  },
});

const jail = (s: MonopolyState, p: string): MonopolyState => ({
  ...s,
  players: {
    ...s.players,
    [p]: { ...s.players[p]!, position: 10, inJail: true, jailTurns: 0 },
  },
  phase: "post-roll",
});

const move = (s: MonopolyState, p: string, d: number): MonopolyState => {
  const x = s.players[p]!;
  const bonus = d < x.position ? 200 : 0;
  return {
    ...s,
    players: {
      ...s.players,
      [p]: { ...x, position: d, cash: x.cash + bonus },
    },
  };
};

// --- Chance & Community Chest card decks (16 cards each) ---

const CH: Card[] = [
  ...[0, 24, 11, 39, 5].map((d) => ({
    text: "Advance to " + BOARD[d]!.name + ".",
    effect: (s: MonopolyState, p: string) => move(s, p, d),
  })),
  {
    text: "Bank dividend: collect $50.",
    effect: (s: MonopolyState, p: string) => cash(s, p, 50),
  },
  {
    text: "Advance to nearest railroad; resolve rent bonus.",
    effect: (s: MonopolyState, p: string) =>
      move(s, p, [5, 15, 25, 35].find((x) => x > s.players[p]!.position) ?? 5),
  },
  {
    text: "Advance to nearest utility.",
    effect: (s: MonopolyState, p: string) =>
      move(s, p, UT.find((x) => x > s.players[p]!.position) ?? 12),
  },
  {
    text: "Repairs: pay $25 per house and $100 per hotel.",
    effect: (s: MonopolyState, p: string) =>
      cash(
        s,
        p,
        -Object.values(s.properties)
          .filter((x) => x.owner === p)
          .reduce((a, x) => a + (x.houses === 5 ? 100 : x.houses * 25), 0),
      ),
  },
  {
    text: "Go to jail.",
    effect: jail,
  },
  {
    text: "Move back three spaces.",
    effect: (s: MonopolyState, p: string) =>
      move(s, p, (s.players[p]!.position + 37) % 40),
  },
  {
    text: "Receive $150.",
    effect: (s: MonopolyState, p: string) => cash(s, p, 150),
  },
  {
    text: "Get-out-of-jail pass.",
    effect: (s: MonopolyState, p: string) => ({
      ...s,
      players: {
        ...s.players,
        [p]: {
          ...s.players[p]!,
          jailFreeCards: s.players[p]!.jailFreeCards + 1,
        },
      },
    }),
  },
];

while (CH.length < 16) {
  CH.push({ text: "Pay $15.", effect: (s: MonopolyState, p: string) => cash(s, p, -15) });
}

const CC: Card[] = [
  {
    text: "Advance to GO and collect $200.",
    effect: (s: MonopolyState, p: string) => move(s, p, 0),
  },
  {
    text: "Receive $200.",
    effect: (s: MonopolyState, p: string) => cash(s, p, 200),
  },
  {
    text: "Pay $50.",
    effect: (s: MonopolyState, p: string) => cash(s, p, -50),
  },
  {
    text: "Receive $100.",
    effect: (s: MonopolyState, p: string) => cash(s, p, 100),
  },
  {
    text: "Receive $50.",
    effect: (s: MonopolyState, p: string) => cash(s, p, 50),
  },
  {
    text: "Pay $100.",
    effect: (s: MonopolyState, p: string) => cash(s, p, -100),
  },
  {
    text: "Go to jail.",
    effect: jail,
  },
  {
    text: "Get-out-of-jail pass.",
    effect: (s: MonopolyState, p: string) => ({
      ...s,
      players: {
        ...s.players,
        [p]: {
          ...s.players[p]!,
          jailFreeCards: s.players[p]!.jailFreeCards + 1,
        },
      },
    }),
  },
];

while (CC.length < 16) {
  CC.push({
    text: "Community payment: receive $25.",
    effect: (s: MonopolyState, p: string) => cash(s, p, 25),
  });
}

const shuffle = (n: number): number[] =>
  Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);

// --- State initialization ---

export function initMonopoly(ids: string[]): MonopolyState {
  const players = Object.fromEntries(
    ids.map((id) => [
      id,
      {
        id,
        cash: 1500,
        position: 0,
        inJail: false,
        jailTurns: 0,
        jailFreeCards: 0,
        bankrupt: false,
      },
    ]),
  );

  const properties = Object.fromEntries(
    BOARD.filter((x) => ["property", "railroad", "utility"].includes(x.type)).map(
      (x) => [x.id, { owner: null, houses: 0, mortgaged: false }],
    ),
  );

  return {
    players,
    order: ids,
    turnIndex: 0,
    properties,
    dice: null,
    doublesStreak: 0,
    phase: "pre-roll",
    freeParkingPot: 0,
    lastCard: null,
    winner: null,
    chanceDeck: shuffle(16),
    chestDeck: shuffle(16),
    pendingTrade: null,
  };
}

// --- Pure accessors ---

export const currentPlayerId = (s: MonopolyState): string =>
  s.order[s.turnIndex]!;

export const ownsFullGroup = (
  s: MonopolyState,
  p: string,
  c: PropertyColor,
): boolean =>
  BOARD.filter((x) => x.color === c).every(
    (x) => s.properties[x.id]?.owner === p,
  );

export function calculateRent(s: MonopolyState, id: number): number {
  const x = BOARD[id]!;
  const p = s.properties[id]!;
  if (!p?.owner) return 0;

  if (x.type === "railroad") {
    return [0, 25, 50, 100, 200][
      RR.filter((i) => s.properties[i]?.owner === p.owner).length
    ]!;
  }

  if (x.type === "utility") {
    return (
      ((s.dice?.[0] ?? 0) + (s.dice?.[1] ?? 0)) *
      (UT.filter((i) => s.properties[i]?.owner === p.owner).length > 1 ? 10 : 4)
    );
  }

  const r = x.rent ?? [0];
  if (p.houses) return r[p.houses]!;
  return ownsFullGroup(s, p.owner, x.color!) ? r[0]! * 2 : r[0]!;
}

// --- Rent ladder for property detail panel ---

export interface RentLadder {
  baseRent: number;
  colorSetRent: number;
  houses: number[];
  hotel: number;
  houseCost: number;
  mortgageValue: number;
  unmortgageCost: number;
}

export function getRentLadder(s: MonopolyState, id: number): RentLadder | null {
  const x = BOARD[id]!;
  const p = s.properties[id];
  if (!x.rent || !p) return null;

  const mortgageValue = Math.floor((x.price ?? 0) / 2);
  const unmortgageCost = Math.ceil(mortgageValue * 1.1);

  if (x.type === "railroad") {
    const count = RR.filter((i) => s.properties[i]?.owner === p.owner).length;
    return {
      baseRent: [0, 25, 50, 100, 200][count]!,
      colorSetRent: 0,
      houses: [],
      hotel: 0,
      houseCost: 0,
      mortgageValue,
      unmortgageCost,
    };
  }

  if (x.type === "utility") {
    const count = UT.filter((i) => s.properties[i]?.owner === p.owner).length;
    return {
      baseRent: 0,
      colorSetRent: 0,
      houses: [],
      hotel: 0,
      houseCost: 0,
      mortgageValue,
      unmortgageCost,
    };
  }

  const r = x.rent;
  return {
    baseRent: r[0]!,
    colorSetRent: r[0]! * 2,
    houses: [r[1]!, r[2]!, r[3]!, r[4]!],
    hotel: r[5]!,
    houseCost: x.houseCost ?? 0,
    mortgageValue,
    unmortgageCost,
  };
}

// --- Internal resolution helpers ---

const resolve = (s: MonopolyState, p: string, id: number): MonopolyState => {
  const x = BOARD[id]!;

  if (x.type === "go-to-jail") return jail(s, p);

  if (x.type === "tax") {
    return {
      ...cash(s, p, -x.taxAmount!),
      freeParkingPot: s.freeParkingPot + x.taxAmount!,
      phase: "post-roll",
    };
  }

  if (x.type === "free-parking") {
    return {
      ...cash(s, p, s.freeParkingPot),
      freeParkingPot: 0,
      phase: "post-roll",
    };
  }

  if (x.type === "chance" || x.type === "chest") {
    const key = x.type === "chance" ? "chanceDeck" : "chestDeck";
    const deck = s[key];
    if (!deck.length) return { ...s, phase: "post-roll" };
    const cards = x.type === "chance" ? CH : CC;
    const card = cards[deck[0]]!;
    const after = { ...s, [key]: deck.slice(1) };
    return {
      ...card.effect(after, p),
      lastCard: card.text,
      phase: "post-roll",
    };
  }

  if (["property", "railroad", "utility"].includes(x.type)) {
    const prop = s.properties[id]!;
    if (!prop.owner) return { ...s, phase: "awaiting-buy" };
    if (prop.owner !== p && !prop.mortgaged) {
      const r = calculateRent(s, id);
      return { ...cash(cash(s, p, -r), prop.owner, r), phase: "post-roll" };
    }
    return { ...s, phase: "post-roll" };
  }

  return { ...s, phase: "post-roll" };
};

const moveSteps = (s: MonopolyState, p: string, n: number): MonopolyState => {
  const old = s.players[p]!;
  const d = (old.position + n) % 40;
  const bonus = d < old.position ? 200 : 0;
  return resolve(
    {
      ...s,
      players: {
        ...s.players,
        [p]: { ...old, position: d, cash: old.cash + bonus },
      },
    },
    p,
    d,
  );
};

// --- Exported game actions ---

export function rollDice(s: MonopolyState, p: string): MonopolyState | null {
  if (currentPlayerId(s) !== p || s.phase !== "pre-roll") return null;

  const d1 = 1 + Math.floor(Math.random() * 6);
  const d2 = 1 + Math.floor(Math.random() * 6);
  const dbl = d1 === d2;
  const pl = s.players[p]!;

  if (pl.inJail) {
    if (dbl) {
      return moveSteps(
        {
          ...s,
          dice: [d1, d2],
          players: {
            ...s.players,
            [p]: { ...pl, inJail: false, jailTurns: 0 },
          },
        },
        p,
        d1 + d2,
      );
    }
    const turns = pl.jailTurns + 1;
    if (turns >= 3) {
      return moveSteps(
        {
          ...cash(s, p, -50),
          dice: [d1, d2],
          players: {
            ...s.players,
            [p]: { ...pl, inJail: false, jailTurns: 0 },
          },
        },
        p,
        d1 + d2,
      );
    }
    return {
      ...s,
      dice: [d1, d2],
      players: {
        ...s.players,
        [p]: { ...pl, jailTurns: turns },
      },
      phase: "post-roll",
    };
  }

  let n: MonopolyState = {
    ...s,
    dice: [d1, d2],
    doublesStreak: dbl ? s.doublesStreak + 1 : 0,
  };

  if (n.doublesStreak >= 3) return jail({ ...n, doublesStreak: 0 }, p);
  return moveSteps(n, p, d1 + d2);
}

export function buyProperty(s: MonopolyState, p: string): MonopolyState | null {
  if (currentPlayerId(s) !== p || s.phase !== "awaiting-buy") return null;
  const pl = s.players[p]!;
  const x = BOARD[pl.position]!;
  if (!x.price || pl.cash < x.price) return null;
  return {
    ...cash(s, p, -x.price),
    properties: {
      ...s.properties,
      [x.id]: { owner: p, houses: 0, mortgaged: false },
    },
    phase: "post-roll",
  };
}

export const passOnProperty = (s: MonopolyState, p: string): MonopolyState | null =>
  currentPlayerId(s) === p && s.phase === "awaiting-buy"
    ? { ...s, phase: "post-roll" }
    : null;

export const payBail = (s: MonopolyState, p: string): MonopolyState | null =>
  s.players[p]?.inJail && s.players[p]!.cash >= 50
    ? {
        ...cash(s, p, -50),
        players: {
          ...s.players,
          [p]: { ...s.players[p]!, inJail: false, jailTurns: 0 },
        },
      }
    : null;

export const useJailFreeCard = (s: MonopolyState, p: string): MonopolyState | null =>
  s.players[p]?.inJail && s.players[p]!.jailFreeCards
    ? {
        ...s,
        players: {
          ...s.players,
          [p]: {
            ...s.players[p]!,
            inJail: false,
            jailTurns: 0,
            jailFreeCards: s.players[p]!.jailFreeCards - 1,
          },
        },
      }
    : null;

export function buildHouse(s: MonopolyState, p: string, id: number): MonopolyState | null {
  const x = BOARD[id]!;
  const q = s.properties[id]!;
  if (
    !x?.color ||
    q.owner !== p ||
    q.mortgaged ||
    q.houses >= 5 ||
    !ownsFullGroup(s, p, x.color) ||
    s.players[p]!.cash < (x.houseCost ?? 0)
  ) return null;

  const group = BOARD.filter((z) => z.color === x.color);
  const min = Math.min(...group.map((z) => s.properties[z.id]!.houses));
  if (q.houses > min) return null;

  return {
    ...cash(s, p, -x.houseCost!),
    properties: {
      ...s.properties,
      [id]: { ...q, houses: q.houses + 1 },
    },
  };
}

export const mortgageProperty = (s: MonopolyState, p: string, id: number): MonopolyState | null => {
  const x = BOARD[id];
  const q = s.properties[id];
  if (!x || !q || q.owner !== p || q.mortgaged || q.houses) return null;
  return {
    ...cash(s, p, Math.floor((x.price ?? 0) / 2)),
    properties: {
      ...s.properties,
      [id]: { ...q, mortgaged: true },
    },
  };
};

export const unmortgageProperty = (s: MonopolyState, p: string, id: number): MonopolyState | null => {
  const x = BOARD[id];
  const q = s.properties[id];
  const cost = Math.ceil(((x?.price ?? 0) / 2) * 1.1);
  if (!x || !q || q.owner !== p || !q.mortgaged || s.players[p]!.cash < cost) return null;
  return {
    ...cash(s, p, -cost),
    properties: {
      ...s.properties,
      [id]: { ...q, mortgaged: false },
    },
  };
};

export function proposeTrade(s: MonopolyState, trade: PendingTrade): MonopolyState {
  return { ...s, pendingTrade: trade };
}

export function acceptTrade(s: MonopolyState): MonopolyState {
  const trade = s.pendingTrade;
  if (!trade) return s;
  return { ...s, pendingTrade: null };
}

export function declineTrade(s: MonopolyState): MonopolyState {
  return { ...s, pendingTrade: null };
}

export function endTurn(s: MonopolyState): MonopolyState {
  const p = currentPlayerId(s);
  const dbl = s.dice?.[0] === s.dice?.[1];

  if (s.players[p]!.cash < 0) {
    const players = {
      ...s.players,
      [p]: { ...s.players[p]!, bankrupt: true, cash: 0 },
    };
    const properties = Object.fromEntries(
      Object.entries(s.properties).map(([k, v]) => [
        k,
        v.owner === p ? { owner: null, houses: 0, mortgaged: false } : v,
      ]),
    ) as Record<number, PropertyState>;

    const alive = s.order.filter((i) => !players[i]!.bankrupt);
    if (alive.length <= 1) {
      return {
        ...s,
        players,
        properties,
        phase: "game-over" as TurnPhase,
        winner: alive[0] ?? null,
      };
    }

    let i = s.turnIndex;
    do {
      i = (i + 1) % s.order.length;
    } while (players[s.order[i]!]!.bankrupt);

    return {
      ...s,
      players,
      properties,
      turnIndex: i,
      phase: "pre-roll",
      dice: null,
      doublesStreak: 0,
    };
  }

  if (dbl && !s.players[p]!.inJail) {
    return { ...s, phase: "pre-roll", dice: null };
  }

  let i = s.turnIndex;
  do {
    i = (i + 1) % s.order.length;
  } while (s.players[s.order[i]!]!.bankrupt);

  return {
    ...s,
    turnIndex: i,
    phase: "pre-roll",
    dice: null,
    doublesStreak: 0,
  };
}