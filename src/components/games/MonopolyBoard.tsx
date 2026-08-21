import { BOARD, calculateRent, ownsFullGroup, type MonopolyState, type PropertyColor } from "@/lib/monopoly-engine";
import type { MonopolyTrade } from "@/lib/monopoly-trade";
import { playGameSound } from "@/lib/game-sounds";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

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

function gridPos(id: number) {
  if (id === 0) return { row: 11, col: 11 };
  if (id <= 9) return { row: 11, col: 11 - id };
  if (id === 10) return { row: 11, col: 1 };
  if (id <= 19) return { row: 11 - (id - 10), col: 1 };
  if (id === 20) return { row: 1, col: 1 };
  if (id <= 29) return { row: 1, col: 1 + (id - 20) };
  if (id === 30) return { row: 1, col: 11 };
  return { row: 1 + (id - 30), col: 11 };
}

/* Trade Modal */

function TradeModal({
  open,
  onOpenChange,
  state,
  players,
  myPlayerId,
  onTrade,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: MonopolyState;
  players: { id: string; name: string }[];
  myPlayerId: string;
  onTrade: (trade: MonopolyTrade) => void;
}) {
  const [partnerId, setPartnerId] = useState<string>("");
  const [offerProps, setOfferProps] = useState<Set<number>>(new Set());
  const [requestProps, setRequestProps] = useState<Set<number>>(new Set());
  const [offerCash, setOfferCash] = useState(0);
  const [requestCash, setRequestCash] = useState(0);

  const otherPlayers = players.filter(
    (p) => p.id !== myPlayerId && !state.players[p.id]?.bankrupt,
  );

  if (!partnerId && otherPlayers.length > 0) {
    setPartnerId(otherPlayers[0]!.id);
  }

  const myProperties = BOARD.filter(
    (s) =>
      state.properties[s.id]?.owner === myPlayerId &&
      !state.properties[s.id]?.mortgaged &&
      (state.properties[s.id]?.houses ?? 0) === 0 &&
      ["property", "railroad", "utility"].includes(s.type),
  );

  const partnerProperties = partnerId
    ? BOARD.filter(
        (s) =>
          state.properties[s.id]?.owner === partnerId &&
          !state.properties[s.id]?.mortgaged &&
          (state.properties[s.id]?.houses ?? 0) === 0 &&
          ["property", "railroad", "utility"].includes(s.type),
      )
    : [];

  const myCash = state.players[myPlayerId]?.cash ?? 0;
  const partnerCash = partnerId ? (state.players[partnerId]?.cash ?? 0) : 0;

  const toggleOffer = (id: number) => {
    setOfferProps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRequest = (id: number) => {
    setRequestProps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canSubmit =
    partnerId &&
    (offerProps.size > 0 || requestProps.size > 0 || offerCash > 0 || requestCash > 0) &&
    offerCash <= myCash &&
    requestCash <= partnerCash;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onTrade({
      id: crypto.randomUUID(),
      from: myPlayerId,
      to: partnerId,
      offerCash,
      requestCash,
      offerProperties: [...offerProps],
      requestProperties: [...requestProps],
    });
    setOfferProps(new Set());
    setRequestProps(new Set());
    setOfferCash(0);
    setRequestCash(0);
    onOpenChange(false);
  };

  const partnerName = players.find((p) => p.id === partnerId)?.name ?? "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">🤝</span> Propose a Trade
          </DialogTitle>
          <DialogDescription>
            Select properties and cash to swap with another player.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-foreground">Trade with:</label>
          <select
            value={partnerId}
            onChange={(e) => {
              setPartnerId(e.target.value);
              setRequestProps(new Set());
              setRequestCash(0);
            }}
            className="rounded-lg border-2 border-border bg-card px-3 py-2 text-sm font-medium text-card-foreground focus:border-primary focus:outline-none"
          >
            {otherPlayers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (${state.players[p.id]?.cash})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border-2 border-red-200 bg-red-50/50 p-4 dark:border-red-900 dark:bg-red-950/30">
            <h4 className="mb-2 text-sm font-bold text-red-700 dark:text-red-300">You Give</h4>
            <div className="mb-3 space-y-1.5">
              {myProperties.length === 0 && (
                <p className="text-xs text-muted-foreground">No tradeable properties</p>
              )}
              {myProperties.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs transition hover:bg-secondary/50">
                  <input type="checkbox" checked={offerProps.has(s.id)} onChange={() => toggleOffer(s.id)} className="accent-red-500" />
                  <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: s.color ? COLOR_HEX[s.color] : "#777" }} />
                  <span className="truncate font-medium">{s.name}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">$</span>
              <input type="number" min={0} max={myCash} value={offerCash || ""} onChange={(e) => setOfferCash(Math.max(0, Number(e.target.value)))} placeholder="0" className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm focus:border-primary focus:outline-none" />
              <span className="whitespace-nowrap text-xs text-muted-foreground">of ${myCash}</span>
            </div>
          </div>

          <div className="rounded-xl border-2 border-green-200 bg-green-50/50 p-4 dark:border-green-900 dark:bg-green-950/30">
            <h4 className="mb-2 text-sm font-bold text-green-700 dark:text-green-300">You Request</h4>
            <div className="mb-3 space-y-1.5">
              {partnerProperties.length === 0 && (
                <p className="text-xs text-muted-foreground">{partnerName} has no tradeable properties</p>
              )}
              {partnerProperties.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs transition hover:bg-secondary/50">
                  <input type="checkbox" checked={requestProps.has(s.id)} onChange={() => toggleRequest(s.id)} className="accent-green-600" />
                  <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: s.color ? COLOR_HEX[s.color] : "#777" }} />
                  <span className="truncate font-medium">{s.name}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">$</span>
              <input type="number" min={0} max={partnerCash} value={requestCash || ""} onChange={(e) => setRequestCash(Math.max(0, Number(e.target.value)))} placeholder="0" className="w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm focus:border-primary focus:outline-none" />
              <span className="whitespace-nowrap text-xs text-muted-foreground">of ${partnerCash}</span>
            </div>
          </div>
        </div>

        {(offerProps.size > 0 || requestProps.size > 0 || offerCash > 0 || requestCash > 0) && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm">
            <p className="mb-1 font-semibold text-primary">Trade Summary</p>
            <div className="flex items-center gap-3 text-xs text-foreground">
              <span>You give: {[[...offerProps].map((id) => BOARD[id]?.name), offerCash > 0 ? "$" + offerCash : null].filter(Boolean).join(", ") || "nothing"}</span>
              <span className="text-lg">⇄</span>
              <span>You get: {[[...requestProps].map((id) => BOARD[id]?.name), requestCash > 0 ? "$" + requestCash : null].filter(Boolean).join(", ") || "nothing"}</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50">Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={!canSubmit} className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow transition-all hover:scale-[1.02] disabled:opacity-40 disabled:hover:scale-100">Execute Trade</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* Main Board */

export function MonopolyBoard({
  state, players, myPlayerId, myTurn, disabled,
  onRoll, onBuy, onPass, onPayBail, onUseJailCard, onBuildHouse, onMortgage, onUnmortgage, onEndTurn, onTrade,
}: {
  state: MonopolyState;
  players: { id: string; name: string }[];
  myPlayerId: string; myTurn: boolean; disabled?: boolean;
  onRoll: () => void; onBuy: () => void; onPass: () => void; onPayBail: () => void; onUseJailCard: () => void;
  onBuildHouse: (id: number) => void; onMortgage: (id: number) => void; onUnmortgage: (id: number) => void;
  onEndTurn: () => void; onTrade: (trade: MonopolyTrade) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [diceKey, setDiceKey] = useState(0);
  const [lastMove, setLastMove] = useState<string | null>(null);
  const colorIndex: Record<string, number> = {};
  players.forEach((p, i) => (colorIndex[p.id] = i));
  const me = state.players[myPlayerId];
  const current = state.players[state.order[state.turnIndex]!];
  const currentSpace = current ? BOARD[current.position] : null;
  const mine = BOARD.filter((s) => state.properties[s.id]?.owner === myPlayerId);
  const canTrade = myTurn && !disabled && (state.phase === "pre-roll" || state.phase === "post-roll");

  return (
    <div className="grid w-full gap-4 xl:grid-cols-[280px_minmax(700px,1fr)_240px]">
      <aside className="order-2 rounded-2xl border bg-card p-4 shadow-sm xl:order-1">
        <h3 className="mb-3 text-lg font-bold">My properties</h3>
        <div className="space-y-2">
          {mine.length ? (
            mine.map((s) => {
              const p = state.properties[s.id]!;
              return (
                <button key={s.id} onClick={() => setSelected(s.id)} className="w-full rounded-xl border p-3 text-left transition hover:scale-[1.01]" style={{ borderLeft: "8px solid " + (s.color ? COLOR_HEX[s.color] : "#777") }}>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Rent: ${calculateRent(state, s.id)} · {p.houses === 5 ? "Hotel" : p.houses + " houses"} {p.mortgaged ? " · MORTGAGED" : ""}
                  </div>
                </button>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">Buy properties to track rent and upgrades here.</p>
          )}
        </div>
      </aside>
      <main className="order-1 min-w-0 xl:order-2">
        <div className="mx-auto grid aspect-square w-full max-w-[900px] rounded-2xl bg-background p-1 shadow-2xl" style={{ gridTemplateColumns: "repeat(11,1fr)", gridTemplateRows: "repeat(11,1fr)" }}>
          {BOARD.map((space) => {
            const pos = gridPos(space.id);
            const prop = state.properties[space.id];
            const tokens = players.filter((p) => state.players[p.id]?.position === space.id && !state.players[p.id]?.bankrupt);
            return (
              <button key={space.id} onClick={() => setSelected(space.id)} style={{ gridRow: pos.row, gridColumn: pos.col }} className="relative flex min-h-0 flex-col overflow-hidden border bg-card text-[9px] transition hover:z-10 hover:scale-105">
                <div className="h-3 w-full" style={{ backgroundColor: space.color ? COLOR_HEX[space.color] : "transparent" }} />
                <div className="flex flex-1 flex-col items-center justify-center p-1 text-center font-medium">
                  {space.name}
                  {space.price && <span className="text-muted-foreground">${space.price}</span>}
                  {prop?.owner && <span className="mt-1 h-2 w-6 rounded" style={{ backgroundColor: TOKEN_COLORS[colorIndex[prop.owner]] }} />}
                  {prop && prop.houses > 0 && <span>{prop.houses === 5 ? "🏠🏠🏠🏠🏠" : "🏠".repeat(prop.houses)}</span>}
                </div>
                <div className="absolute bottom-1 right-1 flex gap-0.5">
                  {tokens.map((p) => <span key={p.id} className="h-3 w-3 animate-pulse rounded-full border-2 border-white" style={{ backgroundColor: TOKEN_COLORS[colorIndex[p.id]] }} />)}
                </div>
              </button>
            );
          })}

          <section style={{ gridRow: "2 / 11", gridColumn: "2 / 11" }} className="flex flex-col items-center justify-center gap-4 rounded-xl border bg-gradient-to-br from-secondary/40 to-primary/10 p-6 text-center">
            <h1 className="text-3xl font-black tracking-wide">MONOPOLY</h1>
            {state.dice && (
              <div className="flex gap-3 text-4xl">
                <span className="dice-roll rounded-xl bg-card p-3 shadow" key={diceKey + "a"}>{state.dice[0]}</span>
                <span className="dice-roll rounded-xl bg-card p-3 shadow" style={{ animationDelay: "0.1s" }} key={diceKey + "b"}>{state.dice[1]}</span>
              </div>
            )}
            {state.lastCard && <div className="card-flip max-w-md rounded-xl border bg-card p-4 text-sm shadow">🃏 {state.lastCard}</div>}

            {myTurn && !disabled && (
              <div className="flex flex-wrap justify-center gap-2">
                {state.phase === "pre-roll" && (<>
                  <button onClick={() => { setDiceKey(k => k + 1); playGameSound("dice-roll"); setTimeout(() => playGameSound("doubles"), 600); onRoll(); }} className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground shadow hover:scale-105">{me?.inJail ? "Roll for doubles" : "🎲 Roll dice"}</button>
                  {me?.inJail && <button onClick={onPayBail} className="rounded-xl border px-4">Pay bail</button>}
                  {me?.inJail && me.jailFreeCards > 0 && <button onClick={onUseJailCard} className="rounded-xl border px-4">Use Jail card</button>}
                </>)}
                {state.phase === "awaiting-buy" && currentSpace && (<>
                  <button onClick={() => { playGameSound("property-buy"); onBuy(); }} className="rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">Buy {currentSpace.name} (${currentSpace.price})</button>
                  <button onClick={onPass} className="rounded-xl border px-5">Pass</button>
                </>)}
                {state.phase === "post-roll" && (<>
                  <button onClick={onEndTurn} className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">End turn</button>
                  {mine.filter((s) => s.color && ownsFullGroup(state, myPlayerId, s.color)).map((s) => <button key={s.id} onClick={() => { playGameSound("house-build"); onBuildHouse(s.id); }} className="rounded-xl border px-3 text-xs">🏠 Build {s.name}</button>)}
                </>)}
                {canTrade && <button onClick={() => setTradeOpen(true)} className="rounded-xl border-2 border-dashed border-primary/50 bg-primary/10 px-5 py-3 text-sm font-bold text-primary transition-all hover:scale-105 hover:border-primary hover:bg-primary/20">🤝 Trade</button>}
              </div>
            )}
            {!myTurn && <p className="text-muted-foreground">Waiting for {players.find((p) => p.id === state.order[state.turnIndex])?.name}…</p>}
          </section>
        </div>
      </main>
      <aside className="order-3 rounded-2xl border bg-card p-4 shadow-sm">
        <h3 className="mb-3 font-bold">Players</h3>
        <div className="space-y-2">
          {players.map((p, i) => {
            const ps = state.players[p.id];
            return (
              <div key={p.id} className={"rounded-xl border p-3 " + (state.order[state.turnIndex] === p.id ? "ring-2 ring-primary" : "")}>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: TOKEN_COLORS[i] }} />
                  <b>{p.name}</b>
                </div>
                <div className="mt-1 text-sm">💰 ${ps?.cash}</div>
              </div>
            );
          })}
        </div>
        {selected !== null && (
          <div className="mt-4 rounded-xl border p-3 text-sm">
            <b>{BOARD[selected]?.name}</b>
            <div>Current rent: ${state.properties[selected]?.owner ? calculateRent(state, selected) : 0}</div>
            {state.properties[selected]?.owner === myPlayerId && (
              <button className="mt-2 rounded-lg border px-2 py-1 text-xs" onClick={() => { playGameSound("mortgage"); state.properties[selected]?.mortgaged ? onUnmortgage(selected) : onMortgage(selected); }}>
                {state.properties[selected]?.mortgaged ? "Unmortgage" : "Mortgage"}
              </button>
            )}
          </div>
        )}
      </aside>

      <TradeModal open={tradeOpen} onOpenChange={setTradeOpen} state={state} players={players} myPlayerId={myPlayerId} onTrade={onTrade} />
    </div>
  );
}
