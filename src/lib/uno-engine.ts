// Pure, client-safe Uno game logic for the board game hub.
// No Supabase / React imports here, matching game-engine.ts conventions.

export type UnoColor = "red" | "yellow" | "green" | "blue";
export type UnoCard = string; // "red-5" | "red-skip" | "red-reverse" | "red-draw2" | "wild" | "wild-draw4"

const COLORS: UnoColor[] = ["red", "yellow", "green", "blue"];

export interface UnoState {
  deck: UnoCard[];
  discard: UnoCard[];
  hands: Record<string, UnoCard[]>;
  color: UnoColor;
  direction: 1 | -1;
  order: string[]; // player_ids in seat order
  turnIndex: number;
}

function buildDeck(): UnoCard[] {
  const cards: UnoCard[] = [];
  for (const c of COLORS) {
    cards.push(`${c}-0`);
    for (let n = 1; n <= 9; n++) {
      cards.push(`${c}-${n}`, `${c}-${n}`);
    }
    for (const action of ["skip", "reverse", "draw2"]) {
      cards.push(`${c}-${action}`, `${c}-${action}`);
    }
  }
  for (let i = 0; i < 4; i++) cards.push("wild");
  for (let i = 0; i < 4; i++) cards.push("wild-draw4");
  return cards;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

export function cardColor(card: UnoCard): UnoColor | null {
  if (card.startsWith("wild")) return null;
  const [c] = card.split("-");
  return c as UnoColor;
}

export function cardRank(card: UnoCard): string {
  const parts = card.split("-");
  return parts.slice(1).join("-") || parts[0]!;
}

/** Draw `count` cards from deck, reshuffling discard (keeping its top card) if needed. */
function drawFromPile(
  deck: UnoCard[],
  discard: UnoCard[],
  count: number,
): { drawn: UnoCard[]; deck: UnoCard[]; discard: UnoCard[] } {
  let d = deck.slice();
  let disc = discard.slice();
  const drawn: UnoCard[] = [];
  for (let i = 0; i < count; i++) {
    if (d.length === 0) {
      const top = disc[disc.length - 1];
      if (!top) break;
      const rest = disc.slice(0, -1);
      if (rest.length === 0) break;
      d = shuffle(rest);
      disc = [top];
    }
    const c = d.shift();
    if (c) drawn.push(c);
  }
  return { drawn, deck: d, discard: disc };
}

export function initUno(playerIds: string[]): UnoState {
  let deck = shuffle(buildDeck());
  const hands: Record<string, UnoCard[]> = {};
  for (const pid of playerIds) {
    hands[pid] = deck.slice(0, 7);
    deck = deck.slice(7);
  }

  // Flip the first non-wild card to start the discard pile.
  const drawnWilds: UnoCard[] = [];
  let starter: UnoCard | undefined;
  while (deck.length) {
    const c = deck.shift()!;
    if (c.startsWith("wild")) {
      drawnWilds.push(c);
    } else {
      starter = c;
      break;
    }
  }
  deck = [...deck, ...drawnWilds];
  const discardTop = starter ?? "red-0"; // extremely unlikely fallback
  const color = (cardColor(discardTop) ?? "red") as UnoColor;

  return {
    deck,
    discard: [discardTop],
    hands,
    color,
    direction: 1,
    order: playerIds,
    turnIndex: 0,
  };
}

export function canPlay(card: UnoCard, topDiscard: UnoCard, activeColor: UnoColor): boolean {
  if (card.startsWith("wild")) return true;
  const color = cardColor(card);
  if (color === activeColor) return true;
  if (cardRank(card) === cardRank(topDiscard)) return true;
  return false;
}

export function currentPlayerId(state: UnoState): string {
  return state.order[state.turnIndex]!;
}

function advance(order: string[], turnIndex: number, direction: 1 | -1, steps: number): number {
  const n = order.length;
  return ((turnIndex + direction * steps) % n + n) % n;
}

/** Play `card` for `playerId`. `chosenColor` is required for wild cards. Returns null if illegal. */
export function playCard(
  state: UnoState,
  playerId: string,
  card: UnoCard,
  chosenColor?: UnoColor,
): UnoState | null {
  if (currentPlayerId(state) !== playerId) return null;
  const hand = state.hands[playerId];
  if (!hand) return null;
  const idx = hand.indexOf(card);
  if (idx === -1) return null;
  const top = state.discard[state.discard.length - 1]!;
  if (!canPlay(card, top, state.color)) return null;

  const newHand = hand.slice();
  newHand.splice(idx, 1);
  const newHands: Record<string, UnoCard[]> = { ...state.hands, [playerId]: newHand };
  let discard = [...state.discard, card];
  let deck = state.deck;
  let direction = state.direction;
  let color: UnoColor = state.color;
  let steps = 1;

  const rank = cardRank(card);
  const isWild = card.startsWith("wild");

  if (isWild) {
    color = chosenColor ?? "red";
    if (rank === "draw4") {
      const targetIdx = advance(state.order, state.turnIndex, direction, 1);
      const targetId = state.order[targetIdx]!;
      const res = drawFromPile(deck, discard, 4);
      deck = res.deck;
      discard = res.discard;
      newHands[targetId] = [...(newHands[targetId] ?? []), ...res.drawn];
      steps = 2;
    }
  } else {
    color = (cardColor(card) ?? state.color) as UnoColor;
    if (rank === "skip") {
      steps = 2;
    } else if (rank === "reverse") {
      if (state.order.length > 2) {
        direction = state.direction === 1 ? -1 : 1;
        steps = 1;
      } else {
        steps = 2; // acts as Skip in a 2-player game
      }
    } else if (rank === "draw2") {
      const targetIdx = advance(state.order, state.turnIndex, direction, 1);
      const targetId = state.order[targetIdx]!;
      const res = drawFromPile(deck, discard, 2);
      deck = res.deck;
      discard = res.discard;
      newHands[targetId] = [...(newHands[targetId] ?? []), ...res.drawn];
      steps = 2;
    }
  }

  const turnIndex = advance(state.order, state.turnIndex, direction, steps);

  return { ...state, deck, discard, hands: newHands, color, direction, turnIndex };
}

/** Current player draws one card from the pile. */
export function drawForTurn(state: UnoState, playerId: string): UnoState | null {
  if (currentPlayerId(state) !== playerId) return null;
  const res = drawFromPile(state.deck, state.discard, 1);
  const hand = [...(state.hands[playerId] ?? []), ...res.drawn];
  return { ...state, deck: res.deck, discard: res.discard, hands: { ...state.hands, [playerId]: hand } };
}

/** Pass the turn without playing (used after a draw that couldn't/wasn't played). */
export function passTurn(state: UnoState): UnoState {
  const turnIndex = advance(state.order, state.turnIndex, state.direction, 1);
  return { ...state, turnIndex };
}

export function hasPlayableCard(state: UnoState, playerId: string): boolean {
  const hand = state.hands[playerId] ?? [];
  const top = state.discard[state.discard.length - 1]!;
  return hand.some((c) => canPlay(c, top, state.color));
}

/** Returns the winning player's id, or null if no one has emptied their hand. */
export function checkWinner(state: UnoState): string | null {
  for (const pid of state.order) {
    if ((state.hands[pid] ?? []).length === 0) return pid;
  }
  return null;
}
