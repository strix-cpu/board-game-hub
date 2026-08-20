import type { CFBoard } from "@/lib/game-engine";

export function ConnectFourBoard({
  grid,
  winningCells,
  onMove,
  myTurn,
  disabled,
}: {
  grid: CFBoard;
  winningCells: [number, number][] | null;
  onMove: (col: number) => void;
  myTurn: boolean;
  disabled?: boolean;
}) {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const winSet = winningCells ? new Set(winningCells.map(([r, c]) => `${r}:${c}`)) : null;

  return (
    <div className="flex flex-col gap-2">
      {/* drop buttons */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }).map((_, col) => {
          const colFull = grid.every((row) => row[col] !== null);
          const interactive = myTurn && !colFull && !disabled;
          return (
            <button
              key={col}
              type="button"
              disabled={!interactive}
              onClick={() => onMove(col)}
              className={[
                "flex aspect-square items-center justify-center rounded-full text-2xl transition-all",
                interactive
                  ? "cursor-pointer bg-primary/20 text-primary hover:scale-110 hover:bg-primary/30"
                  : "cursor-default bg-transparent text-muted-foreground/20",
              ].join(" ")}
              aria-label={`drop piece in column ${col + 1}`}
            >
              ↓
            </button>
          );
        })}
      </div>

      {/* board */}
      <div
        className="felt grid gap-2 rounded-2xl p-3 sm:p-4"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const isWin = winSet?.has(`${r}:${c}`) ?? false;
            return (
              <div
                key={`${r}:${c}`}
                className={[
                  "flex aspect-square items-center justify-center rounded-full",
                  isWin ? "ring-4 ring-primary/70" : "",
                ].join(" ")}
                style={{ background: "oklch(0.12 0.03 150)" }}
              >
                {cell && (
                  <span
                    className={[
                      "piece-drop block h-[78%] w-[78%] rounded-full",
                      cell === "X" ? "bg-player-x" : "bg-player-o",
                      isWin ? "ring-2 ring-white/60" : "",
                    ].join(" ")}
                    style={{
                      boxShadow:
                        "inset 0 -4px 8px oklch(0 0 0 / 0.25), inset 0 4px 8px oklch(1 0 0 / 0.25)",
                    }}
                  />
                )}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
