import { BOARD, ownsFullGroup, type MonopolyState, type PropertyColor } from "@/lib/monopoly-engine";

const COLOR_HEX: Record<PropertyColor, string> = {
  brown: "#8B4513",
  "light-blue": "#87CEEB",
  pink: "#FF69B4",
  orange: "#FFA500",
  red: "#DC2626",
  yellow: "#FFD700",
  green: "#16A34A",
  "dark-blue": "#1E3A8A",
};

const TOKEN_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308"];

function gridPos(id: number): { row: number; col: number } {
  if (id === 0) return { row: 11, col: 11 };
  if (id <= 9) return { row: 11, col: 11 - id };
  if (id === 10) return { row: 11, col: 1 };
  if (id <= 19) return { row: 11 - (id - 10), col: 1 };
  if (id === 20) return { row: 1, col: 1 };
  if (id <= 29) return { row: 1, col: 1 + (id - 20) };
  if (id === 30) return { row: 1, col: 11 };
  return { row: 1 + (id - 30), col: 11 };
}

function Space({
  space,
  tokens,
  ownerColorIdx,
  houses,
  mortgaged,
}: {
  space: (typeof BOARD)[number];
  tokens: { name: string; color: string }[];
  ownerColorIdx: number | null;
  houses: number;
  mortgaged: boolean;
}) {
  const pos = gridPos(space.id);
  const isCorner = [0, 10, 20, 30].includes(space.id);
  return (
    <div
      className={[
        "relative flex flex-col overflow-hidden border border-border/70 bg-card text-[7px] leading-tight",
        isCorner ? "items-center justify-center text-center text-[8px] font-bold" : "",
        mortgaged ? "opacity-50" : "",
      ].join(" ")}
      style={{ gridRow: pos.row, gridColumn: pos.col }}
      title={space.name}
    >
      {space.color && <div className="h-2.5 w-full shrink-0" style={{ backgroundColor: COLOR_HEX[space.color] }} />}
      <div className="flex flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-center">
        <span className="line-clamp-2 font-medium text-card-foreground">{space.name}</span>
        {space.price && <span className="text-card-muted">${space.price}</span>}
        {ownerColorIdx !== null && (
          <span className="h-1.5 w-4 rounded-full" style={{ backgroundColor: TOKEN_COLORS[ownerColorIdx] }} />
        )}
        {houses > 0 && houses < 5 && (
          <span className="flex gap-0.5">
            {Array.from({ length: houses }).map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 rounded-sm bg-green-600" />
            ))}
          </span>
        )}
        {houses === 5 && <span className="rounded-sm bg-red-600 px-1 text-[6px] font-bold text-white">HOTEL</span>}
      </div>
      {tokens.length > 0 && (
        <div className="absolute bottom-0.5 right-0.5 flex flex-wrap gap-0.5">
          {tokens.map((t, i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full border border-white/70"
              style={{ backgroundColor: t.color }}
              title={t.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MonopolyBoard({
  state,
  players,
  myPlayerId,
  myTurn,
  disabled,
  onRoll,
  onBuy,
  onPass,
  onPayBail,
  onUseJailCard,
  onBuildHouse,
  onMortgage,
  onUnmortgage,
  onEndTurn,
}: {
  state: MonopolyState;
  players: { id: string; name: string }[];
  myPlayerId: string;
  myTurn: boolean;
  disabled?: boolean;
  onRoll: () => void;
  onBuy: () => void;
  onPass: () => void;
  onPayBail: () => void;
  onUseJailCard: () => void;
  onBuildHouse: (spaceId: number) => void;
  onMortgage: (spaceId: number) => void;
  onUnmortgage: (spaceId: number) => void;
  onEndTurn: () => void;
}) {
  const playerColorIdx: Record<string, number> = {};
  players.forEach((p, i) => (playerColorIdx[p.id] = i));

  const me = state.players[myPlayerId];
  const currentPlayer = state.players[state.order[state.turnIndex]!];
  const currentSpace = currentPlayer ? BOARD[currentPlayer.position]! : null;

  const myProperties = BOARD.filter(
    (s) => (s.type === "property" || s.type === "railroad" || s.type === "utility") && state.properties[s.id]?.owner === myPlayerId,
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <div
        className="mx-auto grid aspect-square w-full max-w-[640px]"
        style={{ gridTemplateColumns: "repeat(11, 1fr)", gridTemplateRows: "repeat(11, 1fr)" }}
      >
        {BOARD.map((space) => {
          const tokens = players.filter((p) => state.players[p.id]?.position === space.id && !state.players[p.id]?.bankrupt);
          const prop = state.properties[space.id];
          return (
            <Space
              key={space.id}
              space={space}
              tokens={tokens.map((t) => ({ name: t.name, color: TOKEN_COLORS[playerColorIdx[t.id]!] ?? "#999" }))}
              ownerColorIdx={prop?.owner ? playerColorIdx[prop.owner] ?? null : null}
              houses={prop?.houses ?? 0}
              mortgaged={prop?.mortgaged ?? false}
            />
          );
        })}

        {/* center panel */}
        <div
          className="flex flex-col items-center justify-center gap-3 border border-border/70 bg-secondary/20 p-4 text-center"
          style={{ gridRow: "2 / 11", gridColumn: "2 / 11" }}
        >
          {state.dice && (
            <div className="flex gap-2 text-3xl font-bold text-foreground">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-border bg-card">
                {state.dice[0]}
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-border bg-card">
                {state.dice[1]}
              </span>
            </div>
          )}

          {state.lastCard && <p className="max-w-xs text-sm italic text-card-muted">"{state.lastCard}"</p>}

          {state.phase === "game-over" ? (
            <p className="text-xl font-bold text-foreground">
              {state.winner === myPlayerId ? "You win!" : `${players.find((p) => p.id === state.winner)?.name ?? "A player"} wins!`}
            </p>
          ) : myTurn && !disabled ? (
            <div className="flex flex-col items-center gap-2">
              {me?.inJail && state.phase === "pre-roll" && (
                <div className="flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={onPayBail} disabled={me.cash < 50} className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium disabled:opacity-40">
                    Pay $50 bail
                  </button>
                  {me.jailFreeCards > 0 && (
                    <button type="button" onClick={onUseJailCard} className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium">
                      Use Jail Free card
                    </button>
                  )}
                </div>
              )}

              {state.phase === "pre-roll" && (
                <button type="button" onClick={onRoll} className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90">
                  {me?.inJail ? "Roll for doubles" : "Roll dice"}
                </button>
              )}

              {state.phase === "awaiting-buy" && currentSpace && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm font-medium text-card-foreground">
                    Buy {currentSpace.name} for ${currentSpace.price}?
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={onBuy} className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
                      Buy
                    </button>
                    <button type="button" onClick={onPass} className="rounded-lg border border-border px-4 py-1.5 text-sm font-medium">
                      Pass
                    </button>
                  </div>
                </div>
              )}

              {state.phase === "post-roll" && (
                <div className="flex flex-col items-center gap-2">
                  {myProperties.some((s) => s.color && ownsFullGroup(state, myPlayerId, s.color)) && (
                    <div className="flex flex-wrap justify-center gap-1">
                      {myProperties
                        .filter((s) => s.color)
                        .map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => onBuildHouse(s.id)}
                            className="rounded border border-border px-2 py-1 text-[10px] hover:bg-secondary/50"
                            title={`Build on ${s.name} ($${s.houseCost})`}
                          >
                            🏠 {s.name.split(" ")[0]}
                          </button>
                        ))}
                    </div>
                  )}
                  <button type="button" onClick={onEndTurn} className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90">
                    End turn
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-card-muted">
              Waiting for {players.find((p) => p.id === state.order[state.turnIndex])?.name}…
            </p>
          )}
        </div>
      </div>

      {/* players summary */}
      <div className="flex flex-wrap justify-center gap-3">
        {players.map((p, i) => {
          const ps = state.players[p.id];
          if (!ps) return null;
          return (
            <div
              key={p.id}
              className={[
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
                ps.bankrupt ? "border-border/40 opacity-40 line-through" : "border-border",
                state.order[state.turnIndex] === p.id ? "ring-2 ring-primary" : "",
              ].join(" ")}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TOKEN_COLORS[i] }} />
              <span className="font-medium">{p.name}</span>
              <span className="text-card-muted">${ps.cash}</span>
              {ps.inJail && <span className="text-xs">🔒</span>}
            </div>
          );
        })}
      </div>

      {/* my properties: mortgage controls */}
      {myProperties.length > 0 && (
        <div className="rounded-xl border border-border p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-card-muted">My properties</p>
          <div className="flex flex-wrap gap-2">
            {myProperties.map((s) => {
              const prop = state.properties[s.id]!;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => (prop.mortgaged ? onUnmortgage(s.id) : onMortgage(s.id))}
                  disabled={!myTurn || disabled || prop.houses > 0}
                  className={[
                    "rounded-lg border px-2.5 py-1 text-xs disabled:opacity-40",
                    prop.mortgaged ? "border-red-400 text-red-500" : "border-border",
                  ].join(" ")}
                >
                  {s.name} {prop.mortgaged ? "(mortgaged — unmortgage)" : "(mortgage)"}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
