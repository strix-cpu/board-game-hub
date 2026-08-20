import type { TTTBoard } from "@/lib/game-engine";

export function TicTacToeBoard({
  cells,
  winningLine,
  onMove,
  myTurn,
  disabled,
}: {
  cells: TTTBoard;
  winningLine: number[] | null;
  onMove: (index: number) => void;
  myTurn: boolean;
  disabled?: boolean;
}) {
  const winSet = winningLine ? new Set(winningLine) : null;
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
      {cells.map((cell, i) => {
        const isWin = winSet?.has(i) ?? false;
        const empty = cell === null;
        const interactive = myTurn && empty && !disabled;
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => onMove(i)}
            className={[
              "flex aspect-square items-center justify-center rounded-xl border-2 transition-all",
              "text-5xl sm:text-6xl font-bold leading-none",
              isWin
                ? "border-primary bg-primary/15"
                : "border-[color:var(--border)]",
              interactive
                ? "cursor-pointer hover:scale-[1.03] hover:bg-accent/10"
                : "cursor-default",
              cell === "X" ? "text-player-x" : cell === "O" ? "text-player-o" : "text-muted-foreground",
            ].join(" ")}
            style={{ background: isWin ? undefined : "oklch(0.965 0.018 95)" }}
            aria-label={`cell ${i + 1}${cell ? `, ${cell}` : empty ? ", empty" : ""}`}
          >
            {cell && <span className="pop-in inline-block">{cell}</span>}
            {empty && myTurn && !disabled && (
              <span className="text-2xl text-muted-foreground/30 opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-100" />
            )}
          </button>
        );
      })}
    </div>
  );
}
