import { useEffect, useRef, useState } from "react";
import { BOARD, ownsFullGroup, type MonopolyState, type PropertyColor } from "@/lib/monopoly-engine";
import { useSfx } from "@/hooks/use-sfx";

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

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
};

function Die({ value, rolling }: { value: number; rolling: boolean }) {
  return (
    <span
      className={[
        "grid h-11 w-11 grid-cols-3 grid-rows-3 place-items-center rounded-xl border-2 border-border bg-card p-1 shadow-lg",
        rolling ? "dice-tumble" : "",
      ].join(" ")}
      aria-label={`Die showing ${value}`}
    >
      {Array.from({ length: 9 }).map((_, i) => {
        const r = Math.floor(i / 3);
        const c = i % 3;
        const on = (PIPS[value] ?? []).some(([pr, pc]) => pr === r && pc === c);
        return <span key={i} className={on ? "h-1.5 w-1.5 rounded-full bg-card-foreground" : ""} />;
      })}
    </span>
  );
}

function Space({
  space,
  tokens,
  ownerColorIdx,
  houses,
  mortgaged,
  active,
}: {
  space: (typeof BOARD)[number];
  tokens: { name: string; color: string; hop: boolean }[];
  ownerColorIdx: number | null;
  houses: number;
  mortgaged: boolean;
  active: boolean;
}) {
  const pos = gridPos(space.id);
  const isCorner = [0, 10, 20, 30].includes(space.id);
  return (
    <div
      className={[
        "relative flex flex-col overflow-hidden border border-border/70 bg-card text-[7px] leading-tight transition-all duration-300",
        isCorner ? "items-center justify-center text-center text-[8px] font-bold" : "",
        mortgaged ? "opacity-50" : "",
        active ? "z-10 scale-[1.06] shadow-[0_0_0_2px_var(--color-primary)]" : "",
      ].join(" ")}
      style={{ gridRow: pos.row, gridColumn: pos.col }}
      title={space.name}
    >
      {space.color && (
        <div className="h-2.5 w-full shrink-0 transition-all" style={{ backgroundColor: COLOR_HEX[space.color] }} />
      )}
      <div className="flex flex-1 flex-col items-center justify-center gap-0.5 px-0.5 text-center">
        <span className="line-clamp-2 font-medium text-card-foreground">{space.name}</span>
        {space.price && <span className="text-card-muted">${space.price}</span>}
        {ownerColorIdx !== null && (
          <span
            className="pop-in h-1.5 w-4 rounded-full"
            style={{ backgroundColor: TOKEN_COLORS[ownerColorIdx] }}
          />
        )}
        {houses > 0 && houses < 5 && (
          <span className="flex gap-0.5">
            {Array.from({ length: houses }).map((_, i) => (
              <span key={i} className="pop-in h-1.5 w-1.5 rounded-sm bg-green-600" />
            ))}
          </span>
        )}
        {houses === 5 && (
          <span className="pop-in rounded-sm bg-red-600 px-1 text-[6px] font-bold text-card">HOTEL</span>
        )}
      </div>
      {tokens.length > 0 && (
        <div className="absolute bottom-0.5 right-0.5 flex flex-wrap gap-0.5">
          {tokens.map((t, i) => (
            <span
              key={i}
              className={[
                "h-2 w-2 rounded-full border border-card shadow",
                t.hop ? "token-hop" : "pop-in",
              ].join(" ")}
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
  const sfx = useSfx();
  const [rolling, setRolling] = useState(false);
  const [movedIds, setMovedIds] = useState<string[]>([]);
  const [cashDeltas, setCashDeltas] = useState<Record<string, number>>({});

  const prevPositions = useRef<Record<string, number>>({});
  const prevCash = useRef<Record<string, number>>({});
  const prevDice = useRef<string | null>(null);
  const prevCard = useRef<string | null>(null);
  const prevPhase = useRef<string>(state.phase);
  const prevTurn = useRef<string | undefined>(state.order[state.turnIndex]);
  const prevOwned = useRef<number>(0);

  // dice roll: tumble + sound
  useEffect(() => {
    const key = state.dice ? state.dice.join("-") + ":" + state.turnIndex + ":" + state.doublesStreak : null;
    if (key && key !== prevDice.current) {
      prevDice.current = key;
      setRolling(true);
      sfx("dice");
      const t = setTimeout(() => setRolling(false), 620);
      return () => clearTimeout(t);
    }
    prevDice.current = key;
    return;
  }, [state.dice, state.turnIndex, state.doublesStreak, sfx]);

  // token movement + cash changes
  useEffect(() => {
    const moved: string[] = [];
    const deltas: Record<string, number> = {};
    for (const p of players) {
      const ps = state.players[p.id];
      if (!ps) continue;
      const before = prevPositions.current[p.id];
      if (before !== undefined && before !== ps.position) moved.push(p.id);
      const cashBefore = prevCash.current[p.id];
      if (cashBefore !== undefined && cashBefore !== ps.cash) deltas[p.id] = ps.cash - cashBefore;
      prevPositions.current[p.id] = ps.position;
      prevCash.current[p.id] = ps.cash;
    }
    if (moved.length) {
      setMovedIds(moved);
      sfx("hop");
      setTimeout(() => setMovedIds([]), 500);
    }
    if (Object.keys(deltas).length) {
      setCashDeltas(deltas);
      sfx("coin");
      setTimeout(() => setCashDeltas({}), 1100);
    }
  }, [state.players, players, sfx]);

  // cards, jail, purchases, turn changes, game over
  useEffect(() => {
    if (state.lastCard && state.lastCard !== prevCard.current) sfx("card");
    prevCard.current = state.lastCard;
  }, [state.lastCard, sfx]);

  useEffect(() => {
    const owned = Object.values(state.properties).filter((p) => p.owner).length;
    if (owned > prevOwned.current && prevOwned.current !== 0) sfx("buy");
    prevOwned.current = owned;
  }, [state.properties, sfx]);

  useEffect(() => {
    const now = state.order[state.turnIndex];
    if (now !== prevTurn.current) {
      prevTurn.current = now;
      if (now === myPlayerId) sfx("turn");
    }
  }, [state.turnIndex, state.order, myPlayerId, sfx]);

  useEffect(() => {
    if (state.phase === "game-over" && prevPhase.current !== "game-over") {
      sfx(state.winner === myPlayerId ? "win" : "lose");
    }
    prevPhase.current = state.phase;
  }, [state.phase, state.winner, myPlayerId, sfx]);

  const withSound = (fn: () => void, sound: Parameters<typeof sfx>[0] = "click") => () => {
    sfx(sound);
    fn();
  };

  const playerColorIdx: Record<string, number> = {};
  players.forEach((p, i) => (playerColorIdx[p.id] = i));

  const me = state.players[myPlayerId];
  const currentPlayer = state.players[state.order[state.turnIndex]!];
  const currentSpace = currentPlayer ? BOARD[currentPlayer.position]! : null;
  const currentName = players.find((p) => p.id === state.order[state.turnIndex])?.name;

  const myProperties = BOARD.filter(
    (s) =>
      (s.type === "property" || s.type === "railroad" || s.type === "utility") &&
      state.properties[s.id]?.owner === myPlayerId,
  );

  return (
    <div className="flex w-full flex-col gap-4">
      {/* turn banner */}
      <div
        className={[
          "slide-down-in mx-auto flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
          myTurn && state.phase !== "game-over"
            ? "border-primary bg-primary/15 text-primary glow-pulse"
            : "border-border/60 bg-secondary/30 text-muted-foreground",
        ].join(" ")}
        key={`${state.turnIndex}-${state.phase}`}
      >
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TOKEN_COLORS[playerColorIdx[state.order[state.turnIndex] ?? ""] ?? 0] }} />
        {state.phase === "game-over"
          ? "Game over"
          : myTurn
            ? state.phase === "pre-roll"
              ? "Your turn — roll the dice"
              : state.phase === "awaiting-buy"
                ? "Your turn — buy or pass"
                : "Your turn — build or end turn"
            : `${currentName ?? "Someone"} is playing…`}
      </div>

      <div
        className="mx-auto grid aspect-square w-full max-w-[640px]"
        style={{ gridTemplateColumns: "repeat(11, 1fr)", gridTemplateRows: "repeat(11, 1fr)" }}
      >
        {BOARD.map((space) => {
          const tokens = players.filter(
            (p) => state.players[p.id]?.position === space.id && !state.players[p.id]?.bankrupt,
          );
          const prop = state.properties[space.id];
          return (
            <Space
              key={space.id}
              space={space}
              tokens={tokens.map((t) => ({
                name: t.name,
                color: TOKEN_COLORS[playerColorIdx[t.id]!] ?? "#999",
                hop: movedIds.includes(t.id),
              }))}
              ownerColorIdx={prop?.owner ? playerColorIdx[prop.owner] ?? null : null}
              houses={prop?.houses ?? 0}
              mortgaged={prop?.mortgaged ?? false}
              active={currentPlayer?.position === space.id}
            />
          );
        })}

        {/* center panel */}
        <div
          className="relative flex flex-col items-center justify-center gap-3 overflow-hidden border border-border/70 bg-secondary/20 p-4 text-center"
          style={{ gridRow: "2 / 11", gridColumn: "2 / 11" }}
        >
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,var(--color-primary)/12%,transparent_65%)]" />

          {state.dice && (
            <div className="flex gap-2" key={state.dice.join("-") + state.turnIndex}>
              <Die value={state.dice[0]} rolling={rolling} />
              <Die value={state.dice[1]} rolling={rolling} />
            </div>
          )}

          {state.lastCard && (
            <p
              key={state.lastCard}
              className="slide-down-in max-w-xs rounded-lg border border-border/60 bg-card px-3 py-2 text-sm italic text-card-muted shadow"
            >
              {state.lastCard}
            </p>
          )}

          {state.phase === "game-over" ? (
            <div className="relative">
              {state.winner === myPlayerId &&
                Array.from({ length: 8 }).map((_, i) => (
                  <span
                    key={i}
                    className="confetti-rise absolute h-1.5 w-1.5 rounded-sm"
                    style={{
                      left: `${i * 13 - 10}%`,
                      backgroundColor: TOKEN_COLORS[i % TOKEN_COLORS.length],
                      animationDelay: `${i * 0.12}s`,
                    }}
                  />
                ))}
              <p className="text-xl font-bold text-foreground">
                {state.winner === myPlayerId
                  ? "You win!"
                  : `${players.find((p) => p.id === state.winner)?.name ?? "A player"} wins!`}
              </p>
            </div>
          ) : myTurn && !disabled ? (
            <div className="flex flex-col items-center gap-2">
              {me?.inJail && state.phase === "pre-roll" && (
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={withSound(onPayBail, "coin")}
                    disabled={me.cash < 50}
                    className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium transition-transform hover:scale-105 disabled:opacity-40"
                  >
                    Pay $50 bail
                  </button>
                  {me.jailFreeCards > 0 && (
                    <button
                      type="button"
                      onClick={withSound(onUseJailCard, "card")}
                      className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium transition-transform hover:scale-105"
                    >
                      Use Jail Free card
                    </button>
                  )}
                </div>
              )}

              {state.phase === "pre-roll" && (
                <button
                  type="button"
                  onClick={withSound(onRoll, "dice")}
                  disabled={rolling}
                  className="glow-pulse rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
                >
                  {me?.inJail ? "Roll for doubles" : "Roll dice"}
                </button>
              )}

              {state.phase === "awaiting-buy" && currentSpace && (
                <div className="slide-down-in flex flex-col items-center gap-2">
                  <p className="text-sm font-medium text-card-foreground">
                    Buy {currentSpace.name} for ${currentSpace.price}?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={withSound(onBuy, "buy")}
                      className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
                    >
                      Buy
                    </button>
                    <button
                      type="button"
                      onClick={withSound(onPass)}
                      className="rounded-lg border border-border px-4 py-1.5 text-sm font-medium transition-transform hover:scale-105"
                    >
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
                        .filter((s) => s.color && ownsFullGroup(state, myPlayerId, s.color))
                        .map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={withSound(() => onBuildHouse(s.id), "build")}
                            className="rounded border border-border px-2 py-1 text-[10px] transition-transform hover:scale-105 hover:bg-secondary/50"
                            title={`Build on ${s.name} ($${s.houseCost})`}
                          >
                            Build {s.name.split(" ")[0]}
                          </button>
                        ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={withSound(onEndTurn, "turn")}
                    className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
                  >
                    End turn
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-card-muted">Waiting for {currentName}…</p>
          )}
        </div>
      </div>

      {/* players summary */}
      <div className="flex flex-wrap justify-center gap-3">
        {players.map((p, i) => {
          const ps = state.players[p.id];
          if (!ps) return null;
          const delta = cashDeltas[p.id];
          const isCurrent = state.order[state.turnIndex] === p.id;
          return (
            <div
              key={p.id}
              className={[
                "relative flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all duration-300",
                ps.bankrupt ? "border-border/40 opacity-40 line-through" : "border-border",
                isCurrent ? "scale-105 ring-2 ring-primary" : "",
              ].join(" ")}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TOKEN_COLORS[i] }} />
              <span className="font-medium">{p.name}</span>
              <span className="text-card-muted">${ps.cash}</span>
              {ps.inJail && (
                <span className="rounded bg-destructive/15 px-1.5 text-[10px] font-semibold uppercase text-destructive">
                  Jail
                </span>
              )}
              {delta !== undefined && delta !== 0 && (
                <span
                  className={[
                    "flash-up pointer-events-none absolute -top-1 right-2 text-xs font-bold",
                    delta > 0 ? "text-green-500" : "text-destructive",
                  ].join(" ")}
                >
                  {delta > 0 ? `+$${delta}` : `-$${Math.abs(delta)}`}
                </span>
              )}
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
                  onClick={withSound(
                    () => (prop.mortgaged ? onUnmortgage(s.id) : onMortgage(s.id)),
                    "coin",
                  )}
                  disabled={!myTurn || disabled || prop.houses > 0}
                  className={[
                    "rounded-lg border px-2.5 py-1 text-xs transition-transform hover:scale-105 disabled:opacity-40",
                    prop.mortgaged ? "border-destructive text-destructive" : "border-border",
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
