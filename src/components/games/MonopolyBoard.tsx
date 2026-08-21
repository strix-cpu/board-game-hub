import { BOARD, calculateRent, ownsFullGroup, getRentLadder, type MonopolyState, type PropertyColor, type PendingTrade } from "@/lib/monopoly-engine";
import type { MonopolyTrade } from "@/lib/monopoly-trade";
import { playGameSound } from "@/lib/game-sounds";
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

/* ── Colour maps ────────────────────────────────────────────── */

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

/* ── Icons for special spaces ────────────────────────────────── */

function SpaceIcon({ type }: { type: string }) {
  const icons: Record<string, string> = { go: "🏁", chance: "❓", chest: "📦", "go-to-jail": "👮", jail: "🔒", "free-parking": "🅿️", tax: "💰" };
  return <span className="text-base leading-none">{icons[type] ?? ""}</span>;
}

/* ── Grid position ────────────────────────────────────────────── */

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

/* ── Property Detail Panel ───────────────────────────────────── */

function PropertyDetail({ spaceId, state, myPlayerId, onMortgage, onUnmortgage }: {
  spaceId: number; state: MonopolyState; myPlayerId: string;
  onMortgage: (id: number) => void; onUnmortgage: (id: number) => void;
}) {
  const space = BOARD[spaceId];
  const prop = state.properties[spaceId];
  const ladder = getRentLadder(state, spaceId);
  if (!space || !prop || !ladder) return null;
  const isMine = prop.owner === myPlayerId;

  return (
    <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-lg">
      <div className="flex items-center gap-3">
        {space.color && <div className="h-10 w-3 rounded-full" style={{ backgroundColor: COLOR_HEX[space.color] }} />}
        <div>
          <div className="font-bold text-gray-900">{space.name}</div>
          {space.price && <div className="text-xs text-gray-500">Price: ${space.price}</div>}
        </div>
      </div>
      {prop.owner && (
        <div className="mt-2 rounded-lg bg-gray-50 px-3 py-1.5 text-xs">
          <span className="font-medium text-gray-600">Owner: </span>
          <span className="font-bold text-gray-800">{prop.owner}</span>
          {prop.mortgaged && <span className="ml-2 text-red-500 font-bold">MORTGAGED</span>}
        </div>
      )}
      {space.type === "property" && ladder.houses.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">Rent</div>
          <div className="grid grid-cols-2 gap-1">
            <div className="rounded bg-gray-50 px-2 py-1 text-xs"><span className="text-gray-500">Base: </span><span className="font-semibold text-gray-800">${ladder.baseRent}</span></div>
            <div className="rounded bg-amber-50 px-2 py-1 text-xs"><span className="text-amber-600">Color Set: </span><span className="font-semibold text-amber-800">${ladder.colorSetRent}</span></div>
            {ladder.houses.map((r, i) => (<div key={i} className="rounded bg-gray-50 px-2 py-1 text-xs"><span className="text-gray-500">{i + 1}H: </span><span className="font-semibold text-gray-800">${r}</span></div>))}
            <div className="col-span-2 rounded bg-red-50 px-2 py-1 text-xs"><span className="text-red-500">🏨 Hotel: </span><span className="font-bold text-red-700">${ladder.hotel}</span></div>
          </div>
        </div>
      )}
      {space.type === "railroad" && <div className="mt-2 text-xs text-gray-500">1: $25 · 2: $50 · 3: $100 · 4: $200</div>}
      {space.type === "utility" && <div className="mt-2 text-xs text-gray-500">1 utility: 4× dice · 2 utilities: 10× dice</div>}
      <div className="mt-3 flex items-center gap-2">
        <div className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-500">Mortgage: <span className="font-semibold text-gray-700">${ladder.mortgageValue}</span></div>
        {isMine && !prop.mortgaged && prop.houses === 0 && <button onClick={() => { playGameSound("mortgage"); onMortgage(spaceId); }} className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-100">Mortgage</button>}
        {isMine && prop.mortgaged && <button onClick={() => { playGameSound("mortgage"); onUnmortgage(spaceId); }} className="rounded-lg border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-600 transition hover:bg-green-100">Unmortgage (${ladder.unmortgageCost})</button>}
      </div>
    </div>
  );
}

/* ── Trade Modal ─────────────────────────────────────────────── */

function TradeModal({ open, onOpenChange, state, players, myPlayerId, onTrade }: {
  open: boolean; onOpenChange: (o: boolean) => void; state: MonopolyState;
  players: { id: string; name: string }[]; myPlayerId: string; onTrade: (t: MonopolyTrade) => void;
}) {
  const [partnerId, setPartnerId] = useState("");
  const [offerProps, setOfferProps] = useState<Set<number>>(new Set());
  const [requestProps, setRequestProps] = useState<Set<number>>(new Set());
  const [offerCash, setOfferCash] = useState(0);
  const [requestCash, setRequestCash] = useState(0);
  const otherPlayers = players.filter((p) => p.id !== myPlayerId && !state.players[p.id]?.bankrupt);
  if (!partnerId && otherPlayers.length > 0) setPartnerId(otherPlayers[0]!.id);
  const myProperties = BOARD.filter((s) => state.properties[s.id]?.owner === myPlayerId && !state.properties[s.id]?.mortgaged && (state.properties[s.id]?.houses ?? 0) === 0 && ["property", "railroad", "utility"].includes(s.type));
  const partnerProperties = partnerId ? BOARD.filter((s) => state.properties[s.id]?.owner === partnerId && !state.properties[s.id]?.mortgaged && (state.properties[s.id]?.houses ?? 0) === 0 && ["property", "railroad", "utility"].includes(s.type)) : [];
  const myCash = state.players[myPlayerId]?.cash ?? 0;
  const partnerCash = partnerId ? (state.players[partnerId]?.cash ?? 0) : 0;
  const toggleOffer = (id: number) => setOfferProps((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleRequest = (id: number) => setRequestProps((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const canSubmit = partnerId && (offerProps.size > 0 || requestProps.size > 0 || offerCash > 0 || requestCash > 0) && offerCash <= myCash && requestCash <= partnerCash;
  const handleSubmit = () => {
    if (!canSubmit) return;
    onTrade({ id: crypto.randomUUID(), from: myPlayerId, to: partnerId, offerCash, requestCash, offerProperties: [...offerProps], requestProperties: [...requestProps] });
    setOfferProps(new Set()); setRequestProps(new Set()); setOfferCash(0); setRequestCash(0); onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle className="flex items-center gap-2 text-card-foreground"><span className="text-2xl">🤝</span> Propose a Trade</DialogTitle><DialogDescription>Select properties and cash to swap.</DialogDescription></DialogHeader>
        <div className="flex items-center gap-3"><label className="text-sm font-medium text-card-foreground">Trade with:</label><select value={partnerId} onChange={(e) => { setPartnerId(e.target.value); setRequestProps(new Set()); setRequestCash(0); }} className="rounded-lg border-2 border-border bg-card px-3 py-2 text-sm font-medium text-card-foreground focus:border-primary focus:outline-none">{otherPlayers.map((p) => (<option key={p.id} value={p.id}>{p.name} (${state.players[p.id]?.cash})</option>))}</select></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4"><h4 className="mb-2 text-sm font-bold text-red-700">You Give</h4><div className="mb-3 space-y-1.5">{myProperties.map((s) => (<label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs hover:bg-red-50"><input type="checkbox" checked={offerProps.has(s.id)} onChange={() => toggleOffer(s.id)} className="accent-red-500" /><span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: s.color ? COLOR_HEX[s.color] : "#777" }} /><span className="truncate font-medium text-gray-800">{s.name}</span></label>))}</div><div className="flex items-center gap-2"><span className="text-sm font-bold text-gray-700">$</span><input type="number" min={0} max={myCash} value={offerCash || ""} onChange={(e) => setOfferCash(Math.max(0, Number(e.target.value)))} placeholder="0" className="w-full rounded-lg border border-red-200 bg-white px-2 py-1.5 text-sm text-gray-800" /><span className="text-xs text-red-400">of ${myCash}</span></div></div>
          <div className="rounded-xl border-2 border-green-300 bg-green-50 p-4"><h4 className="mb-2 text-sm font-bold text-green-700">You Request</h4><div className="mb-3 space-y-1.5">{partnerProperties.map((s) => (<label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-green-200 bg-white px-2.5 py-1.5 text-xs hover:bg-green-50"><input type="checkbox" checked={requestProps.has(s.id)} onChange={() => toggleRequest(s.id)} className="accent-green-600" /><span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: s.color ? COLOR_HEX[s.color] : "#777" }} /><span className="truncate font-medium text-gray-800">{s.name}</span></label>))}</div><div className="flex items-center gap-2"><span className="text-sm font-bold text-gray-700">$</span><input type="number" min={0} max={partnerCash} value={requestCash || ""} onChange={(e) => setRequestCash(Math.max(0, Number(e.target.value)))} placeholder="0" className="w-full rounded-lg border border-green-200 bg-white px-2 py-1.5 text-sm text-gray-800" /><span className="text-xs text-green-400">of ${partnerCash}</span></div></div>
        </div>
        {(offerProps.size > 0 || requestProps.size > 0 || offerCash > 0 || requestCash > 0) && <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm"><p className="mb-1 font-semibold text-amber-700">Trade Summary</p><div className="flex items-center gap-3 text-xs text-gray-800"><span>You give: {[[...offerProps].map((id) => BOARD[id]?.name), offerCash > 0 ? "$" + offerCash : null].filter(Boolean).join(", ") || "nothing"}</span><span className="text-lg">⇄</span><span>You get: {[[...requestProps].map((id) => BOARD[id]?.name), requestCash > 0 ? "$" + requestCash : null].filter(Boolean).join(", ") || "nothing"}</span></div></div>}
        <DialogFooter><button onClick={() => onOpenChange(false)} className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-card-foreground hover:bg-secondary/50">Cancel</button><button onClick={handleSubmit} disabled={!canSubmit} className="rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow hover:scale-[1.02] disabled:opacity-40">Send Proposal</button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Trade Incoming Dialog ────────────────────────────────────── */

function TradeIncomingDialog({ trade, state, players, myPlayerId, onAccept, onDecline }: {
  trade: MonopolyTrade; state: MonopolyState; players: { id: string; name: string }[]; myPlayerId: string; onAccept: () => void; onDecline: () => void;
}) {
  const fromName = players.find((p) => p.id === trade.from)?.name ?? "Someone";
  return (
    <Dialog open={!!trade} onOpenChange={() => onDecline()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2 text-card-foreground"><span className="text-2xl">📬</span> Trade from {fromName}</DialogTitle><DialogDescription>Accept this trade?</DialogDescription></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-red-200 bg-red-50 p-3"><h4 className="mb-1 text-xs font-bold text-red-600">They Offer</h4>{trade.offerProperties.map((id) => (<div key={id} className="flex items-center gap-1.5 text-xs text-gray-700"><span className="h-2 w-2 rounded-sm" style={{ backgroundColor: BOARD[id]?.color ? COLOR_HEX[BOARD[id]!.color!] : "#777" }} />{BOARD[id]?.name}</div>))}{trade.offerCash > 0 && <div className="mt-1 text-xs font-bold text-green-600">+${trade.offerCash}</div>}</div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-3"><h4 className="mb-1 text-xs font-bold text-green-600">They Want</h4>{trade.requestProperties.map((id) => (<div key={id} className="flex items-center gap-1.5 text-xs text-gray-700"><span className="h-2 w-2 rounded-sm" style={{ backgroundColor: BOARD[id]?.color ? COLOR_HEX[BOARD[id]!.color!] : "#777" }} />{BOARD[id]?.name}</div>))}{trade.requestCash > 0 && <div className="mt-1 text-xs font-bold text-red-600">+${trade.requestCash}</div>}</div>
        </div>
        <DialogFooter><button onClick={onDecline} className="rounded-xl border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Decline</button><button onClick={onAccept} className="rounded-xl bg-green-600 px-5 py-2 text-sm font-bold text-white shadow hover:bg-green-700 hover:scale-[1.02]">Accept</button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Card Reveal Animation ───────────────────────────────────── */

function CardReveal({ text, type, onDone }: { text: string; type: "chance" | "chest"; onDone: () => void }) {
  const [phase, setPhase] = useState<"enter" | "show" | "exit">("enter");
  useEffect(() => { const t1 = setTimeout(() => setPhase("show"), 100); const t2 = setTimeout(() => setPhase("exit"), 3200); const t3 = setTimeout(onDone, 3800); return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); }; }, [onDone]);
  const bgColor = type === "chance" ? "#1a5276" : "#b03a2e";
  const icon = type === "chance" ? "❓" : "📦";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
      <div className="w-80 rounded-2xl shadow-2xl" style={{ backgroundColor: bgColor, transform: phase === "enter" ? "scale(0.3) rotateY(90deg)" : phase === "exit" ? "scale(0.5) translateY(-100px) rotateY(-90deg)" : "scale(1) rotateY(0deg)", opacity: phase === "exit" ? 0 : 1, transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
        <div className="rounded-t-2xl p-4 text-center" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}><span className="text-4xl">{icon}</span><div className="mt-1 text-sm font-bold uppercase tracking-wider text-white/80">{type === "chance" ? "Chance" : "Community Chest"}</div></div>
        <div className="p-6 text-center"><p className="text-lg font-bold text-white leading-snug">{text}</p></div>
        <div className="rounded-b-2xl px-6 pb-4 text-center"><span className="text-3xl">{icon}</span></div>
      </div>
    </div>
  );
}

/* ── Board Cell ──────────────────────────────────────────────── */

function BoardCell({ space, prop, tokens, colorIndex, isSelected, onSelect }: {
  space: (typeof BOARD)[number]; prop?: { owner: string | null; houses: number; mortgaged: boolean };
  tokens: { id: string; name: string }[]; colorIndex: Record<string, number>; isSelected: boolean; onSelect: () => void;
}) {
  const pos = gridPos(space.id);
  const ownerColor = prop?.owner ? TOKEN_COLORS[colorIndex[prop.owner]] : null;
  const isSpecial = ["go", "chance", "chest", "jail", "go-to-jail", "free-parking", "tax"].includes(space.type);
  const isCorner = space.id === 0 || space.id === 10 || space.id === 20 || space.id === 30;
  const cellBg = isSpecial ? "#d5e8f0" : "#f0f4f8";

  /* Detect position for layout direction */
  const isTopRow = pos.row === 1 && pos.col >= 2 && pos.col <= 10;
  const isBottomRow = pos.row === 11 && pos.col >= 2 && pos.col <= 10;
  const isLeftCol = pos.col === 1 && pos.row >= 2 && pos.row <= 10;
  const isRightCol = pos.col === 11 && pos.row >= 2 && pos.row <= 10;
  const isHorizontal = isTopRow || isBottomRow;

  return (
    <button onClick={onSelect} style={{ gridRow: pos.row, gridColumn: pos.col, backgroundColor: cellBg }}
      className={["relative flex overflow-hidden rounded-lg border border-gray-300/40 transition-all duration-200 shadow-sm", isHorizontal ? "flex-col" : "flex-row", isCorner ? "flex-col items-center justify-center" : "", isSelected ? "z-10 ring-3 ring-amber-400 scale-[1.03] shadow-xl" : "hover:z-10 hover:scale-[1.04] hover:shadow-lg"].join(" ")}>
      {/* Color bar - vertical for horizontal cells, horizontal for vertical cells */}
      {!isSpecial && space.color && !isCorner && (
        isHorizontal
          ? <div className="h-3 w-full shrink-0" style={{ backgroundColor: COLOR_HEX[space.color] }} />
          : <div className="h-full w-3 shrink-0" style={{ backgroundColor: COLOR_HEX[space.color] }} />
      )}
      {!isSpecial && space.color && isCorner && <div className="h-2 w-full shrink-0" style={{ backgroundColor: COLOR_HEX[space.color] }} />}
      {/* Content */}
      <div className={["flex flex-1 flex-col justify-center px-2 py-2 text-center min-w-0", isCorner ? "items-center gap-0.5" : isHorizontal ? "items-center" : "items-center"].join(" ")}>
        {isSpecial ? (
          <><span className="text-lg leading-none"><SpaceIcon type={space.type} /></span><span className="font-extrabold leading-tight" style={{ fontSize: "11px", color: "#1a3a4a" }}>{space.name}</span>{space.taxAmount && <span className="text-[10px] font-bold text-red-600">${space.taxAmount}</span>}</>
        ) : (
          <><span className="block w-full font-bold" style={{ fontSize: "10px", color: ownerColor || "#1a3a4a", lineHeight: 1.3, wordBreak: "break-word" }}>{space.name}</span>{space.price && <span className="inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold leading-none" style={{ backgroundColor: "#e8f0f8", color: "#1a3a4a" }}>${space.price} $</span>}</>
        )}
        {prop?.owner && <span className="mt-1 h-1 w-6 rounded-full shrink-0" style={{ backgroundColor: ownerColor ?? "#999" }} />}
        {prop && prop.houses > 0 && <span className="mt-0.5 leading-none shrink-0" style={{ fontSize: "10px" }}>{prop.houses === 5 ? "🏨" : "🏠".repeat(prop.houses)}</span>}
      </div>
      {/* Player tokens */}
      {tokens.length > 0 && <div className={["flex gap-0.5 shrink-0", isCorner ? "absolute bottom-1.5 right-1.5" : isRightCol ? "absolute top-1.5 left-1.5 flex-col" : isLeftCol ? "absolute top-1.5 right-1.5 flex-col" : "absolute bottom-1.5 right-1.5"].join(" ")}>
        {tokens.map((p) => (<span key={p.id} className="h-5 w-5 rounded-full border-2 border-white shadow-md shrink-0" style={{ backgroundColor: TOKEN_COLORS[colorIndex[p.id]] ?? "#999" }} title={p.name} />))}
      </div>}
    </button>
  );
}

/* ── Main Board ──────────────────────────────────────────────── */

export function MonopolyBoard({
  state, players, myPlayerId, myTurn, disabled,
  onRoll, onBuy, onPass, onPayBail, onUseJailCard, onBuildHouse, onMortgage, onUnmortgage, onEndTurn, onTrade,
  pendingTrade, onAcceptTrade, onDeclineTrade,
}: {
  state: MonopolyState; players: { id: string; name: string }[]; myPlayerId: string; myTurn: boolean; disabled?: boolean;
  onRoll: () => void; onBuy: () => void; onPass: () => void; onPayBail: () => void; onUseJailCard: () => void;
  onBuildHouse: (id: number) => void; onMortgage: (id: number) => void; onUnmortgage: (id: number) => void;
  onEndTurn: () => void; onTrade: (t: MonopolyTrade) => void;
  pendingTrade: MonopolyTrade | null; onAcceptTrade: () => void; onDeclineTrade: () => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [showCard, setShowCard] = useState<{ text: string; type: "chance" | "chest" } | null>(null);
  const [diceKey, setDiceKey] = useState(0);
  const prevLastCard = useRef(state.lastCard);

  useEffect(() => {
    if (state.lastCard && state.lastCard !== prevLastCard.current) {
      prevLastCard.current = state.lastCard;
      const currentSpace = BOARD[state.players[myPlayerId]?.position];
      const type = currentSpace?.type === "chance" ? "chance" : "chest";
      playGameSound("card-flip");
      setShowCard({ text: state.lastCard, type });
    }
  }, [state.lastCard, state.players, myPlayerId]);

  const colorIndex: Record<string, number> = {};
  players.forEach((p, i) => (colorIndex[p.id] = i));
  const me = state.players[myPlayerId];
  const currentSpace = me ? BOARD[me.position] : null;
  const mine = BOARD.filter((s) => state.properties[s.id]?.owner === myPlayerId);
  const canTrade = myTurn && !disabled && (state.phase === "pre-roll" || state.phase === "post-roll");

  return (
    <div className="flex w-full flex-col items-center gap-3">
      {/* ─── Board (2.5x original size) ─── */}
      <div className="w-full max-w-[1265px]">
        <div className="mx-auto grid gap-[3px] rounded-2xl p-3 shadow-2xl"
          style={{ gridTemplateColumns: "repeat(11, 1fr)", gridTemplateRows: "repeat(11, 1fr)", backgroundColor: "#4a90b8", aspectRatio: "1 / 1" }}>
          {BOARD.map((space) => (
            <BoardCell key={space.id} space={space} prop={state.properties[space.id]}
              tokens={players.filter((p) => state.players[p.id]?.position === space.id && !state.players[p.id]?.bankrupt)}
              colorIndex={colorIndex} isSelected={selected === space.id} onSelect={() => setSelected(space.id)} />
          ))}
          {/* Centre panel */}
          <section style={{ gridRow: "2 / 11", gridColumn: "2 / 11", backgroundColor: "#f0f4f8" }} className="flex flex-col items-center justify-center gap-8 rounded-xl p-10 text-center">
            <h1 className="text-5xl font-black tracking-wide" style={{ color: "#1a3a4a", fontFamily: "Georgia, serif" }}>MONOPOLY</h1>
            {/* Dice */}
            <div className="flex gap-6">
              <span className="dice-roll flex h-24 w-24 items-center justify-center rounded-2xl bg-white text-6xl font-black shadow-xl border-2 border-gray-200" style={{ color: "#1a3a4a" }} key={diceKey + "a"}>{state.dice?.[0] ?? "?"}</span>
              <span className="dice-roll flex h-24 w-24 items-center justify-center rounded-2xl bg-white text-6xl font-black shadow-xl border-2 border-gray-200" style={{ color: "#1a3a4a", animationDelay: "0.1s" }} key={diceKey + "b"}>{state.dice?.[1] ?? "?"}</span>
            </div>
            {/* Card stacks */}
            <div className="flex gap-10 mt-2">
              <div className="flex flex-col items-center gap-2"><div className="flex h-24 w-[72px] items-center justify-center rounded-xl text-4xl shadow-lg" style={{ backgroundColor: "#1a5276" }}>❓</div><span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#1a5276" }}>Chance</span></div>
              <div className="flex flex-col items-center gap-2"><div className="flex h-24 w-[72px] items-center justify-center rounded-xl text-4xl shadow-lg" style={{ backgroundColor: "#b03a2e" }}>📦</div><span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#b03a2e" }}>Chest</span></div>
            </div>
            {myTurn && !disabled && (
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {state.phase === "pre-roll" && (<><button onClick={() => { setDiceKey((k) => k + 1); playGameSound("dice-roll"); setTimeout(() => playGameSound("doubles"), 600); onRoll(); }} className="rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg hover:scale-105 active:scale-95" style={{ backgroundColor: "#1a5276" }}>{me?.inJail ? "🎲 Roll" : "🎲 Roll dice"}</button>{me?.inJail && <button onClick={onPayBail} className="rounded-xl border-2 border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50" style={{ color: "#1a3a4a" }}>Pay $50</button>}{me?.inJail && me.jailFreeCards > 0 && <button onClick={onUseJailCard} className="rounded-xl border-2 border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50" style={{ color: "#1a3a4a" }}>Jail Card</button>}</>)}
                {state.phase === "awaiting-buy" && currentSpace && (<><button onClick={() => { playGameSound("property-buy"); onBuy(); }} className="rounded-xl px-5 py-3 text-sm font-bold text-white shadow-lg hover:scale-105" style={{ backgroundColor: "#27ae60" }}>Buy {currentSpace.name} (${currentSpace.price})</button><button onClick={onPass} className="rounded-xl border-2 border-gray-300 bg-white px-5 py-2 text-sm font-medium hover:bg-gray-50" style={{ color: "#1a3a4a" }}>Pass</button></>)}
                {state.phase === "post-roll" && (<><button onClick={onEndTurn} className="rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg hover:scale-105" style={{ backgroundColor: "#1a5276" }}>End turn</button>{mine.filter((s) => s.color && ownsFullGroup(state, myPlayerId, s.color)).map((s) => (<button key={s.id} onClick={() => { playGameSound("house-build"); onBuildHouse(s.id); }} className="rounded-xl border-2 border-gray-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50" style={{ color: "#1a3a4a" }}>🏠 {s.name}</button>))}</>)}
                {canTrade && <button onClick={() => setTradeOpen(true)} className="rounded-xl border-2 border-dashed px-5 py-3 text-sm font-bold hover:scale-105" style={{ borderColor: "#4a90b8", color: "#1a5276", backgroundColor: "rgba(74,144,184,0.08)" }}>🤝 Trade</button>}
              </div>
            )}
            {!myTurn && <p className="text-sm" style={{ color: "#4a6a7a" }}>Waiting for {players.find((p) => p.id === state.order[state.turnIndex])?.name}…</p>}
          </section>
        </div>
      </div>

      {/* ─── Sidebars (below board) ─── */}
      <div className="grid w-full gap-3 lg:grid-cols-[1fr_260px_200px]">
        {/* Left: My Properties */}
        <aside className="rounded-2xl border border-blue-200 bg-[#e8f0f8] p-3 text-gray-800 shadow-md">
          <h3 className="mb-2 text-sm font-bold text-gray-900">My Properties</h3>
          <div className="space-y-1.5">{mine.length > 0 ? mine.map((s) => { const p = state.properties[s.id]!; return (<button key={s.id} onClick={() => setSelected(s.id)} className="w-full rounded-lg border border-gray-200 bg-white p-2.5 text-left shadow-sm hover:shadow-md" style={{ borderLeft: `5px solid ${s.color ? COLOR_HEX[s.color] : "#999"}` }}><div className="text-xs font-semibold text-gray-800">{s.name}</div><div className="mt-0.5 text-[10px] text-gray-500">Rent: ${calculateRent(state, s.id)} · {p.houses === 5 ? "Hotel" : p.houses + "H"}{p.mortgaged ? " · M" : ""}</div></button>); }) : <p className="text-xs text-gray-400">No properties yet.</p>}</div>
          {selected !== null && <PropertyDetail spaceId={selected} state={state} myPlayerId={myPlayerId} onMortgage={onMortgage} onUnmortgage={onUnmortgage} />}
        </aside>
        {/* Centre: Players */}
        <aside className="rounded-2xl border border-blue-200 bg-[#e8f0f8] p-3 text-gray-800 shadow-md">
          <h3 className="mb-2 text-sm font-bold text-gray-900">Players</h3>
          <div className="space-y-1.5">{players.map((p, i) => { const ps = state.players[p.id]; const isActive = state.order[state.turnIndex] === p.id; return (<div key={p.id} className={["rounded-lg border p-2.5 transition-all", isActive ? "border-amber-400 bg-amber-50 ring-2 ring-amber-300/40" : "border-gray-200 bg-white"].join(" ")}><div className="flex items-center gap-2"><span className="h-3.5 w-3.5 rounded-full shadow-sm" style={{ backgroundColor: TOKEN_COLORS[i] }} /><span className="text-xs font-semibold text-gray-800">{p.name}</span>{isActive && <span className="ml-auto text-[9px] font-bold" style={{ color: "#b8860b" }}>● TURN</span>}</div><div className="mt-0.5 text-xs font-medium" style={{ color: "#4a6a7a" }}>💰 ${ps?.cash}</div></div>); })}</div>
        </aside>
        {/* Right: Quick info */}
        <aside className="rounded-2xl border border-blue-200 bg-[#e8f0f8] p-3 text-gray-800 shadow-md">
          <h3 className="mb-2 text-sm font-bold text-gray-900">Info</h3>
          <div className="space-y-1 text-xs" style={{ color: "#4a6a7a" }}>
            <div>Phase: <span className="font-semibold">{state.phase}</span></div>
            <div>Turn: <span className="font-semibold">{players.find((p) => p.id === state.order[state.turnIndex])?.name}</span></div>
          </div>
        </aside>
      </div>

      <TradeModal open={tradeOpen} onOpenChange={setTradeOpen} state={state} players={players} myPlayerId={myPlayerId} onTrade={onTrade} />
      {pendingTrade && pendingTrade.to === myPlayerId && <TradeIncomingDialog trade={pendingTrade} state={state} players={players} myPlayerId={myPlayerId} onAccept={onAcceptTrade} onDecline={onDeclineTrade} />}
      {showCard && <CardReveal text={showCard.text} type={showCard.type} onDone={() => setShowCard(null)} />}
    </div>
  );
}
