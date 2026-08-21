// Pure, client-safe game logic for the board game hub.
// No Supabase / React imports here so it can be shared and tested.
 
export type PlayerSymbol = "X" | "O";
 
export interface GameTypeMeta {
  id: string;
  name: string;
  tagline: string;
  minPlayers: number;
  maxPlayers: number;
  rows: number;
  cols: number;
  emoji: string;
  accent: string;
}
 
export const GAMES: GameTypeMeta[] = [
  {
    id: "tic-tac-toe",
    name: "Tic-Tac-Toe",
    tagline: "First to three in a row wins",
    minPlayers: 2,
    maxPlayers: 2,
    rows: 3,
    cols: 3,
    emoji: "⭕",
    accent: "amber",
  },
  {
    id: "connect-four",
    name: "Connect Four",
    tagline: "Drop pieces, line up four",
    minPlayers: 2,
    maxPlayers: 2,
    rows: 6,
    cols: 7,
    emoji: "🔴",
    accent: "coral",
  },
  {
    id: "uno",
    name: "Uno",
    tagline: "Match colors and numbers, empty your hand first",
    minPlayers: 2,
    maxPlayers: 4,
    rows: 0,
    cols: 0,
    emoji: "🎴",
    accent: "violet",
  },
  {
    id: "monopoly",
    name: "Monopoly",
    tagline: "Buy, build, and bankrupt your way to the top",
    minPlayers: 2,
    maxPlayers: 4,
    rows: 0,
    cols: 0,
    emoji: "🎩",
    accent: "emerald",
  },
  {
    id: "catan",
    name: "Catan",
    tagline: "Settle the island, trade resources, build your empire",
    minPlayers: 3,
    maxPlayers: 4,
    rows: 0,
    cols: 0,
    emoji: "🌾",
    accent: "amber",
  },
];
 
export function gameMeta(id: string): GameTypeMeta | undefined {
  return GAMES.find((g) => g.id === id);
}
 
/* ----------------------------- Tic-Tac-Toe ----------------------------- */
 
export type TTTBoard = (PlayerSymbol | null)[];
 
export function tttInit(): TTTBoard {
  return Array(9).fill(null);
}
 
const TTT_LINES: [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
 
export interface TTTResult {
  winner: PlayerSymbol | null;
  line: number[] | null;
  draw: boolean;
}
 
export function tttWinner(b: TTTBoard): TTTResult {
  for (const line of TTT_LINES) {
    const [a, b1, c] = line;
    const va = b[a];
    if (va && va === b[b1] && va === b[c]) {
      return { winner: va, line: [...line], draw: false };
    }
  }
  return { winner: null, line: null, draw: b.every(Boolean) };
}
 
/* ----------------------------- Connect Four ----------------------------- */
 
export type CFBoard = (PlayerSymbol | null)[][]; // [row][col], row 0 = top
 
export function cfInit(rows = 6, cols = 7): CFBoard {
  return Array.from({ length: rows }, () => Array<PlayerSymbol | null>(cols).fill(null));
}
 
export function cfDrop(
  b: CFBoard,
  col: number,
  sym: PlayerSymbol,
): { board: CFBoard; row: number } | null {
  for (let r = b.length - 1; r >= 0; r--) {
    const row = b[r];
    if (row && !row[col]) {
      const nb = b.map((rr) => rr.slice());
      const nbRow = nb[r];
      if (nbRow) nbRow[col] = sym;
      return { board: nb, row: r };
    }
  }
  return null; // column full
}
 
export interface CFResult {
  winner: PlayerSymbol | null;
  cells: [number, number][] | null;
  draw: boolean;
}
 
export function cfWinner(b: CFBoard): CFResult {
  const rows = b.length;
  const cols = b[0]?.length ?? 0;
  const dirs: [number, number][] = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < rows; r++) {
    const row = b[r];
    if (!row) continue;
    for (let c = 0; c < cols; c++) {
      const s = row[c];
      if (!s) continue;
      for (const [dr, dc] of dirs) {
        const cells: [number, number][] = [[r, c]];
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) break;
          const cell = b[nr]?.[nc];
          if (cell !== s) break;
          cells.push([nr, nc]);
        }
        if (cells.length >= 4) {
          return { winner: s, cells, draw: false };
        }
      }
    }
  }
  if (b.every((row) => row.every(Boolean))) {
    return { winner: null, cells: null, draw: true };
  }
  return { winner: null, cells: null, draw: false };
}
 
/* ----------------------------- Generic helpers ----------------------------- */
 
/**
 * Initialize the stored board JSON for a game type.
 * Note: Uno, Monopoly, and Catan are NOT initialized here because their setup
 * needs the player id list (to deal hands / seed cash / place on the board) —
 * see initUno(), initMonopoly(), initCatan() in their own engine files, called
 * directly from the room page's startGame/playAgain handlers.
 */
export function initBoard(
  gameType: string,
  meta: GameTypeMeta,
): { cells: TTTBoard } | { grid: CFBoard } | Record<string, never> {
  if (gameType === "tic-tac-toe") return { cells: tttInit() };
  if (gameType === "connect-four") return { grid: cfInit(meta.rows, meta.cols) };
  return {};
}
 
