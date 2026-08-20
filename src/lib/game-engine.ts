// Pure, client-safe game logic for the board game hub.
// No Supabase / React imports here so it can be unit-tested and shared.

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
  accent: string; // tailwind-ish descriptor for UI flavor
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
];

export function gameMeta(id: string): GameTypeMeta | undefined {
  return GAMES.find((g) => g.id === id);
}

/* ----------------------------- Tic-Tac-Toe ----------------------------- */

export type TTTBoard = (PlayerSymbol | null)[];

export function tttInit(): TTTBoard {
  return Array(9).fill(null);
}

const TTT_LINES: number[][] = [
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
    if (b[a] && b[a] === b[b1] && b[a] === b[c]) {
      return { winner: b[a] as PlayerSymbol, line, draw: false };
    }
  }
  return { winner: null, line: null, draw: b.every(Boolean) };
}

/* ----------------------------- Connect Four ----------------------------- */

export type CFBoard = (PlayerSymbol | null)[][]; // [row][col], row 0 = top

export function cfInit(rows = 6, cols = 7): CFBoard {
  return Array.from({ length: rows }, () => Array(cols).fill(null));
}

export function cfDrop(
  b: CFBoard,
  col: number,
  sym: PlayerSymbol,
): { board: CFBoard; row: number } | null {
  for (let r = b.length - 1; r >= 0; r--) {
    if (!b[r][col]) {
      const nb = b.map((row) => row.slice());
      nb[r][col] = sym;
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
    for (let c = 0; c < cols; c++) {
      const s = b[r][c];
      if (!s) continue;
      for (const [dr, dc] of dirs) {
        const cells: [number, number][] = [[r, c]];
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k;
          const nc = c + dc * k;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) break;
          if (b[nr][nc] !== s) break;
          cells.push([nr, nc]);
        }
        if (cells.length >= 4) {
          return { winner: s as PlayerSymbol, cells, draw: false };
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

/** Initialize the stored board JSON for a game type. */
export function initBoard(gameType: string, meta: GameTypeMeta): Record<string, unknown> {
  if (gameType === "tic-tac-toe") return { cells: tttInit() };
  if (gameType === "connect-four") return { grid: cfInit(meta.rows, meta.cols) };
  return {};
}
