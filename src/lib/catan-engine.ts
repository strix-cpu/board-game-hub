// Pure, client-safe Catan game logic for the board game hub.
// Simplifications from the full ruleset (kept intentionally simple, same spirit
// as the Monopoly/Uno simplifications):
//  - No harbors / 2:1 or 3:1 port trades — bank trades are a flat 4:1.
//  - No "discard half your hand on a 7" rule for players over 7 cards.
//  - No player-to-player trading yet (bank trade only).

export type ResourceType = "wood" | "brick" | "sheep" | "wheat" | "ore";
export type DevCardType = "knight" | "victory-point" | "road-building" | "year-of-plenty" | "monopoly";

export interface HexTile {
  id: string; // `${q},${r}`
  q: number;
  r: number;
  resource: ResourceType | "desert";
  number: number | null;
  x: number;
  y: number;
}

export interface VertexInfo {
  id: string;
  x: number;
  y: number;
  hexIds: string[];
  building: { owner: string; type: "settlement" | "city" } | null;
}

export interface EdgeInfo {
  id: string; // "v1|v2" sorted
  v1: string;
  v2: string;
  owner: string | null;
}

export interface PlayerCatanState {
  id: string;
  resources: Record<ResourceType, number>;
  devCards: DevCardType[];
  playedKnights: number;
}

export type CatanPhase = "setup-settlement" | "setup-road" | "roll" | "main" | "move-robber" | "game-over";

export interface CatanState {
  hexes: HexTile[];
  vertices: Record<string, VertexInfo>;
  edges: Record<string, EdgeInfo>;
  vertexNeighbors: Record<string, string[]>;
  robberHex: string;
  players: Record<string, PlayerCatanState>;
  order: string[];
  turnIndex: number;
  setupRound: 1 | 2;
  setupPlacedSettlement: string | null;
  phase: CatanPhase;
  lastRoll: [number, number] | null;
  devDeck: DevCardType[];
  longestRoadPlayer: string | null;
  longestRoadLength: number;
  largestArmyPlayer: string | null;
  winner: string | null;
  robberPendingSteal: boolean;
  log: string[];
}

const RESOURCE_COUNTS: Record<ResourceType, number> = { wood: 4, brick: 3, sheep: 4, wheat: 4, ore: 3 };
const NUMBER_TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];
const HEX_SIZE = 60;

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

function axialToPixel(q: number, r: number): { x: number; y: number } {
  return { x: HEX_SIZE * Math.sqrt(3) * (q + r / 2), y: HEX_SIZE * 1.5 * r };
}

function hexCorners(cx: number, cy: number): { x: number; y: number }[] {
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    corners.push({
      x: Math.round((cx + HEX_SIZE * Math.cos(angle)) * 100) / 100,
      y: Math.round((cy + HEX_SIZE * Math.sin(angle)) * 100) / 100,
    });
  }
  return corners;
}

function vKey(x: number, y: number): string {
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}

function buildBoardGeometry(): {
  hexes: HexTile[];
  vertices: Record<string, VertexInfo>;
  edges: Record<string, EdgeInfo>;
  vertexNeighbors: Record<string, string[]>;
} {
  const coords: { q: number; r: number }[] = [];
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      const s = -q - r;
      if (Math.abs(q) <= 2 && Math.abs(r) <= 2 && Math.abs(s) <= 2) coords.push({ q, r });
    }
  }

  const resourcePool: (ResourceType | "desert")[] = ["desert"];
  (Object.entries(RESOURCE_COUNTS) as [ResourceType, number][]).forEach(([res, count]) => {
    for (let i = 0; i < count; i++) resourcePool.push(res);
  });
  const shuffledResources = shuffle(resourcePool);
  const shuffledNumbers = shuffle(NUMBER_TOKENS);
  let numberIdx = 0;

  const hexes: HexTile[] = coords.map((c, i) => {
    const { x, y } = axialToPixel(c.q, c.r);
    const resource = shuffledResources[i]!;
    const number = resource === "desert" ? null : shuffledNumbers[numberIdx++]!;
    return { id: `${c.q},${c.r}`, q: c.q, r: c.r, resource, number, x, y };
  });

  const vertices: Record<string, VertexInfo> = {};
  const edgeSet: Record<string, EdgeInfo> = {};

  for (const hex of hexes) {
    const corners = hexCorners(hex.x, hex.y);
    const cornerIds = corners.map((c) => vKey(c.x, c.y));
    cornerIds.forEach((id, i) => {
      if (!vertices[id]) vertices[id] = { id, x: corners[i]!.x, y: corners[i]!.y, hexIds: [], building: null };
      if (!vertices[id]!.hexIds.includes(hex.id)) vertices[id]!.hexIds.push(hex.id);
    });
    for (let i = 0; i < 6; i++) {
      const a = cornerIds[i]!;
      const b = cornerIds[(i + 1) % 6]!;
      const edgeId = [a, b].sort().join("|");
      if (!edgeSet[edgeId]) edgeSet[edgeId] = { id: edgeId, v1: a, v2: b, owner: null };
    }
  }

  const vertexNeighbors: Record<string, string[]> = {};
  for (const edge of Object.values(edgeSet)) {
    (vertexNeighbors[edge.v1] ??= []).push(edge.v2);
    (vertexNeighbors[edge.v2] ??= []).push(edge.v1);
  }

  return { hexes, vertices, edges: edgeSet, vertexNeighbors };
}

const EMPTY_RESOURCES = (): Record<ResourceType, number> => ({ wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 });

function buildDevDeck(): DevCardType[] {
  const deck: DevCardType[] = [];
  for (let i = 0; i < 14; i++) deck.push("knight");
  for (let i = 0; i < 5; i++) deck.push("victory-point");
  for (let i = 0; i < 2; i++) deck.push("road-building");
  for (let i = 0; i < 2; i++) deck.push("year-of-plenty");
  for (let i = 0; i < 2; i++) deck.push("monopoly");
  return shuffle(deck);
}

export function initCatan(playerIds: string[]): CatanState {
  const geo = buildBoardGeometry();
  const desertHex = geo.hexes.find((h) => h.resource === "desert")!;
  const players: Record<string, PlayerCatanState> = {};
  for (const id of playerIds) {
    players[id] = { id, resources: EMPTY_RESOURCES(), devCards: [], playedKnights: 0 };
  }
  return {
    hexes: geo.hexes,
    vertices: geo.vertices,
    edges: geo.edges,
    vertexNeighbors: geo.vertexNeighbors,
    robberHex: desertHex.id,
    players,
    order: playerIds,
    turnIndex: 0,
    setupRound: 1,
    setupPlacedSettlement: null,
    phase: "setup-settlement",
    lastRoll: null,
    devDeck: buildDevDeck(),
    longestRoadPlayer: null,
    longestRoadLength: 0,
    largestArmyPlayer: null,
    winner: null,
    robberPendingSteal: false,
    log: [],
  };
}

export function currentPlayerId(state: CatanState): string {
  return state.order[state.turnIndex]!;
}

function distanceRuleOk(state: CatanState, vertexId: string): boolean {
  if (state.vertices[vertexId]?.building) return false;
  const neighbors = state.vertexNeighbors[vertexId] ?? [];
  return neighbors.every((n) => !state.vertices[n]?.building);
}

function hasAdjacentRoad(state: CatanState, playerId: string, vertexId: string): boolean {
  return Object.values(state.edges).some((e) => e.owner === playerId && (e.v1 === vertexId || e.v2 === vertexId));
}

export function placeSetupSettlement(state: CatanState, playerId: string, vertexId: string): CatanState | null {
  if (currentPlayerId(state) !== playerId || state.phase !== "setup-settlement") return null;
  if (!distanceRuleOk(state, vertexId)) return null;
  const vertices = {
    ...state.vertices,
    [vertexId]: { ...state.vertices[vertexId]!, building: { owner: playerId, type: "settlement" as const } },
  };
  return { ...state, vertices, phase: "setup-road", setupPlacedSettlement: vertexId };
}

export function placeSetupRoad(state: CatanState, playerId: string, edgeId: string): CatanState | null {
  if (currentPlayerId(state) !== playerId || state.phase !== "setup-road") return null;
  const edge = state.edges[edgeId];
  if (!edge || edge.owner) return null;
  const settlementVertex = state.setupPlacedSettlement;
  if (!settlementVertex || (edge.v1 !== settlementVertex && edge.v2 !== settlementVertex)) return null;

  const edges = { ...state.edges, [edgeId]: { ...edge, owner: playerId } };
  let s: CatanState = { ...state, edges, setupPlacedSettlement: null };

  if (state.setupRound === 2) {
    const vertex = state.vertices[settlementVertex]!;
    const resources = { ...s.players[playerId]!.resources };
    for (const hexId of vertex.hexIds) {
      const hex = s.hexes.find((h) => h.id === hexId);
      if (hex && hex.resource !== "desert") resources[hex.resource as ResourceType] += 1;
    }
    s = { ...s, players: { ...s.players, [playerId]: { ...s.players[playerId]!, resources } } };
  }

  const n = s.order.length;
  let nextIndex = s.turnIndex;
  let nextRound = s.setupRound;
  if (s.setupRound === 1) {
    if (s.turnIndex === n - 1) {
      nextRound = 2;
    } else {
      nextIndex = s.turnIndex + 1;
    }
  } else {
    if (s.turnIndex === 0) {
      return { ...s, phase: "roll", setupRound: nextRound, turnIndex: 0 };
    }
    nextIndex = s.turnIndex - 1;
  }

  return { ...s, phase: "setup-settlement", turnIndex: nextIndex, setupRound: nextRound };
}

function rollTwo(): [number, number] {
  return [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
}

export function rollForTurn(state: CatanState, playerId: string): CatanState | null {
  if (currentPlayerId(state) !== playerId || state.phase !== "roll") return null;
  const [d1, d2] = rollTwo();
  const sum = d1 + d2;
  const s: CatanState = { ...state, lastRoll: [d1, d2] };

  if (sum === 7) return { ...s, phase: "move-robber" };

  const players = { ...s.players };
  for (const hex of s.hexes) {
    if (hex.number !== sum || hex.id === s.robberHex || hex.resource === "desert") continue;
    for (const vertexId of Object.keys(s.vertices)) {
      const v = s.vertices[vertexId]!;
      if (!v.building || !v.hexIds.includes(hex.id)) continue;
      const amount = v.building.type === "city" ? 2 : 1;
      const p = players[v.building.owner]!;
      players[v.building.owner] = {
        ...p,
        resources: { ...p.resources, [hex.resource as ResourceType]: p.resources[hex.resource as ResourceType] + amount },
      };
    }
  }

  return { ...s, players, phase: "main" };
}

export function getStealCandidates(state: CatanState, playerId: string): string[] {
  const targets = Object.values(state.vertices)
    .filter((v) => v.building && v.hexIds.includes(state.robberHex) && v.building.owner !== playerId)
    .map((v) => v.building!.owner);
  return Array.from(new Set(targets));
}

export function moveRobber(state: CatanState, playerId: string, hexId: string): CatanState | null {
  if (currentPlayerId(state) !== playerId || state.phase !== "move-robber") return null;
  if (hexId === state.robberHex) return null;
  const s: CatanState = { ...state, robberHex: hexId };
  const candidates = getStealCandidates(s, playerId);
  if (candidates.length === 0) return { ...s, phase: "main" };
  return { ...s, phase: "main", robberPendingSteal: true };
}

export function stealFrom(state: CatanState, playerId: string, targetId: string): CatanState | null {
  if (currentPlayerId(state) !== playerId || !state.robberPendingSteal) return null;
  const target = state.players[targetId];
  if (!target) return null;
  const pool: ResourceType[] = [];
  (Object.entries(target.resources) as [ResourceType, number][]).forEach(([res, count]) => {
    for (let i = 0; i < count; i++) pool.push(res);
  });
  if (pool.length === 0) return { ...state, robberPendingSteal: false };
  const stolen = pool[Math.floor(Math.random() * pool.length)]!;
  const players = {
    ...state.players,
    [targetId]: { ...target, resources: { ...target.resources, [stolen]: target.resources[stolen] - 1 } },
    [playerId]: {
      ...state.players[playerId]!,
      resources: { ...state.players[playerId]!.resources, [stolen]: state.players[playerId]!.resources[stolen] + 1 },
    },
  };
  return { ...state, players, robberPendingSteal: false };
}

const ROAD_COST: Partial<Record<ResourceType, number>> = { wood: 1, brick: 1 };
const SETTLEMENT_COST: Partial<Record<ResourceType, number>> = { wood: 1, brick: 1, sheep: 1, wheat: 1 };
const CITY_COST: Partial<Record<ResourceType, number>> = { wheat: 2, ore: 3 };
const DEV_CARD_COST: Partial<Record<ResourceType, number>> = { sheep: 1, wheat: 1, ore: 1 };

export const COSTS = { road: ROAD_COST, settlement: SETTLEMENT_COST, city: CITY_COST, devCard: DEV_CARD_COST };

function canAfford(resources: Record<ResourceType, number>, cost: Partial<Record<ResourceType, number>>): boolean {
  return (Object.entries(cost) as [ResourceType, number][]).every(([res, amt]) => resources[res] >= amt);
}
function payCost(resources: Record<ResourceType, number>, cost: Partial<Record<ResourceType, number>>): Record<ResourceType, number> {
  const next = { ...resources };
  (Object.entries(cost) as [ResourceType, number][]).forEach(([res, amt]) => {
    next[res] -= amt;
  });
  return next;
}

function longestRoadForPlayer(state: CatanState, playerId: string): number {
  const playerEdges = Object.values(state.edges).filter((e) => e.owner === playerId);
  if (playerEdges.length === 0) return 0;
  const adjacency: Record<string, string[]> = {};
  for (const e of playerEdges) {
    (adjacency[e.v1] ??= []).push(e.v2);
    (adjacency[e.v2] ??= []).push(e.v1);
  }
  let maxLen = 0;
  const edgeKey = (a: string, b: string) => [a, b].sort().join("|");

  function dfs(vertex: string, visitedEdges: Set<string>, length: number) {
    maxLen = Math.max(maxLen, length);
    for (const next of adjacency[vertex] ?? []) {
      const key = edgeKey(vertex, next);
      if (visitedEdges.has(key)) continue;
      const throughVertex = state.vertices[vertex];
      if (length > 0 && throughVertex?.building && throughVertex.building.owner !== playerId) continue;
      visitedEdges.add(key);
      dfs(next, visitedEdges, length + 1);
      visitedEdges.delete(key);
    }
  }

  for (const startVertex of Object.keys(adjacency)) dfs(startVertex, new Set(), 0);
  return maxLen;
}

function updateLongestRoad(state: CatanState): CatanState {
  let best = state.longestRoadPlayer;
  let bestLen = state.longestRoadLength;
  for (const pid of state.order) {
    const len = longestRoadForPlayer(state, pid);
    if (len >= 5 && len > bestLen) {
      best = pid;
      bestLen = len;
    }
  }
  return { ...state, longestRoadPlayer: best, longestRoadLength: bestLen };
}

function updateLargestArmy(state: CatanState): CatanState {
  let best: string | null = state.largestArmyPlayer;
  let bestCount = best ? state.players[best]!.playedKnights : 2;
  for (const pid of state.order) {
    const count = state.players[pid]!.playedKnights;
    if (count >= 3 && count > bestCount) {
      best = pid;
      bestCount = count;
    }
  }
  return { ...state, largestArmyPlayer: best };
}

export function victoryPoints(state: CatanState, playerId: string): number {
  let vp = 0;
  for (const v of Object.values(state.vertices)) {
    if (v.building?.owner === playerId) vp += v.building.type === "city" ? 2 : 1;
  }
  vp += state.players[playerId]!.devCards.filter((c) => c === "victory-point").length;
  if (state.longestRoadPlayer === playerId) vp += 2;
  if (state.largestArmyPlayer === playerId) vp += 2;
  return vp;
}

function checkWin(state: CatanState): CatanState {
  for (const pid of state.order) {
    if (victoryPoints(state, pid) >= 10) return { ...state, phase: "game-over", winner: pid };
  }
  return state;
}

export function buildRoad(state: CatanState, playerId: string, edgeId: string): CatanState | null {
  if (currentPlayerId(state) !== playerId || state.phase !== "main") return null;
  const edge = state.edges[edgeId];
  if (!edge || edge.owner) return null;
  const player = state.players[playerId]!;
  if (!canAfford(player.resources, ROAD_COST)) return null;
  const connected =
    hasAdjacentRoad(state, playerId, edge.v1) ||
    hasAdjacentRoad(state, playerId, edge.v2) ||
    state.vertices[edge.v1]?.building?.owner === playerId ||
    state.vertices[edge.v2]?.building?.owner === playerId;
  if (!connected) return null;

  const edges = { ...state.edges, [edgeId]: { ...edge, owner: playerId } };
  const players = { ...state.players, [playerId]: { ...player, resources: payCost(player.resources, ROAD_COST) } };
  return updateLongestRoad({ ...state, edges, players });
}

export function buildSettlement(state: CatanState, playerId: string, vertexId: string): CatanState | null {
  if (currentPlayerId(state) !== playerId || state.phase !== "main") return null;
  if (!distanceRuleOk(state, vertexId)) return null;
  if (!hasAdjacentRoad(state, playerId, vertexId)) return null;
  const player = state.players[playerId]!;
  if (!canAfford(player.resources, SETTLEMENT_COST)) return null;

  const vertices = {
    ...state.vertices,
    [vertexId]: { ...state.vertices[vertexId]!, building: { owner: playerId, type: "settlement" as const } },
  };
  const players = { ...state.players, [playerId]: { ...player, resources: payCost(player.resources, SETTLEMENT_COST) } };
  return checkWin(updateLongestRoad({ ...state, vertices, players }));
}

export function buildCity(state: CatanState, playerId: string, vertexId: string): CatanState | null {
  if (currentPlayerId(state) !== playerId || state.phase !== "main") return null;
  const v = state.vertices[vertexId];
  if (!v?.building || v.building.owner !== playerId || v.building.type !== "settlement") return null;
  const player = state.players[playerId]!;
  if (!canAfford(player.resources, CITY_COST)) return null;

  const vertices = { ...state.vertices, [vertexId]: { ...v, building: { owner: playerId, type: "city" as const } } };
  const players = { ...state.players, [playerId]: { ...player, resources: payCost(player.resources, CITY_COST) } };
  return checkWin({ ...state, vertices, players });
}

export function buyDevCard(state: CatanState, playerId: string): CatanState | null {
  if (currentPlayerId(state) !== playerId || state.phase !== "main") return null;
  if (state.devDeck.length === 0) return null;
  const player = state.players[playerId]!;
  if (!canAfford(player.resources, DEV_CARD_COST)) return null;
  const [card, ...rest] = state.devDeck;
  const players = {
    ...state.players,
    [playerId]: { ...player, resources: payCost(player.resources, DEV_CARD_COST), devCards: [...player.devCards, card!] },
  };
  return checkWin({ ...state, players, devDeck: rest });
}

export function playKnight(state: CatanState, playerId: string, hexId: string, stealTargetId?: string): CatanState | null {
  if (currentPlayerId(state) !== playerId || state.phase !== "main") return null;
  const player = state.players[playerId]!;
  const idx = player.devCards.indexOf("knight");
  if (idx === -1) return null;
  const devCards = player.devCards.slice();
  devCards.splice(idx, 1);
  let s: CatanState = {
    ...state,
    players: { ...state.players, [playerId]: { ...player, devCards, playedKnights: player.playedKnights + 1 } },
    robberHex: hexId,
  };

  if (stealTargetId && s.players[stealTargetId]) {
    const target = s.players[stealTargetId]!;
    const pool: ResourceType[] = [];
    (Object.entries(target.resources) as [ResourceType, number][]).forEach(([res, count]) => {
      for (let i = 0; i < count; i++) pool.push(res);
    });
    if (pool.length > 0) {
      const stolen = pool[Math.floor(Math.random() * pool.length)]!;
      s = {
        ...s,
        players: {
          ...s.players,
          [stealTargetId]: { ...target, resources: { ...target.resources, [stolen]: target.resources[stolen] - 1 } },
          [playerId]: {
            ...s.players[playerId]!,
            resources: { ...s.players[playerId]!.resources, [stolen]: s.players[playerId]!.resources[stolen] + 1 },
          },
        },
      };
    }
  }

  return checkWin(updateLargestArmy(s));
}

export function playYearOfPlenty(state: CatanState, playerId: string, res1: ResourceType, res2: ResourceType): CatanState | null {
  if (currentPlayerId(state) !== playerId || state.phase !== "main") return null;
  const player = state.players[playerId]!;
  const idx = player.devCards.indexOf("year-of-plenty");
  if (idx === -1) return null;
  const devCards = player.devCards.slice();
  devCards.splice(idx, 1);
  const resources = { ...player.resources };
  resources[res1] += 1;
  resources[res2] += 1;
  return { ...state, players: { ...state.players, [playerId]: { ...player, devCards, resources } } };
}

export function playMonopoly(state: CatanState, playerId: string, resource: ResourceType): CatanState | null {
  if (currentPlayerId(state) !== playerId || state.phase !== "main") return null;
  const player = state.players[playerId]!;
  const idx = player.devCards.indexOf("monopoly");
  if (idx === -1) return null;
  const devCards = player.devCards.slice();
  devCards.splice(idx, 1);
  let total = 0;
  const players = { ...state.players };
  for (const pid of state.order) {
    if (pid === playerId) continue;
    const p = players[pid]!;
    total += p.resources[resource];
    players[pid] = { ...p, resources: { ...p.resources, [resource]: 0 } };
  }
  players[playerId] = { ...player, devCards, resources: { ...player.resources, [resource]: player.resources[resource] + total } };
  return { ...state, players };
}

export function playRoadBuilding(state: CatanState, playerId: string, edgeId1: string, edgeId2: string): CatanState | null {
  if (currentPlayerId(state) !== playerId || state.phase !== "main") return null;
  const player = state.players[playerId]!;
  const idx = player.devCards.indexOf("road-building");
  if (idx === -1) return null;
  const e1 = state.edges[edgeId1];
  const e2 = state.edges[edgeId2];
  if (!e1 || e1.owner || !e2 || e2.owner) return null;
  const devCards = player.devCards.slice();
  devCards.splice(idx, 1);
  const edges = { ...state.edges, [edgeId1]: { ...e1, owner: playerId }, [edgeId2]: { ...e2, owner: playerId } };
  const players = { ...state.players, [playerId]: { ...player, devCards } };
  return updateLongestRoad({ ...state, edges, players });
}

export function bankTrade(state: CatanState, playerId: string, give: ResourceType, get: ResourceType): CatanState | null {
  if (currentPlayerId(state) !== playerId || state.phase !== "main") return null;
  const rate = 4;
  const player = state.players[playerId]!;
  if (player.resources[give] < rate) return null;
  const resources = { ...player.resources };
  resources[give] -= rate;
  resources[get] += 1;
  return { ...state, players: { ...state.players, [playerId]: { ...player, resources } } };
}

export function endTurn(state: CatanState): CatanState {
  const nextIndex = (state.turnIndex + 1) % state.order.length;
  return { ...state, turnIndex: nextIndex, phase: "roll", lastRoll: null };
}
