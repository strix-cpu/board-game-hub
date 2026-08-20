import { useState } from "react";
import { canPlay, cardColor, cardRank, type UnoCard, type UnoColor } from "@/lib/uno-engine";
 
const COLOR_CLASSES: Record<UnoColor, string> = {
  red: "bg-gradient-to-br from-red-400 to-red-600 text-white border-red-800",
  yellow: "bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-950 border-yellow-700",
  green: "bg-gradient-to-br from-green-400 to-green-600 text-white border-green-800",
  blue: "bg-gradient-to-br from-blue-400 to-blue-600 text-white border-blue-800",
};
 
const COLOR_DOT: Record<UnoColor, string> = {
  red: "bg-red-500",
  yellow: "bg-yellow-400",
  green: "bg-green-500",
  blue: "bg-blue-500",
};
 
const CARD_SHADOW =
  "0 1px 0 rgba(255,255,255,0.55) inset, 0 -10px 14px rgba(0,0,0,0.22) inset, 0 10px 18px rgba(0,0,0,0.35), 0 3px 6px rgba(0,0,0,0.25)";
const CARD_SHADOW_SMALL =
  "0 1px 0 rgba(255,255,255,0.5) inset, 0 -6px 9px rgba(0,0,0,0.2) inset, 0 6px 10px rgba(0,0,0,0.3)";
 
function CardFace({ card, small }: { card: UnoCard; small?: boolean }) {
  const color = cardColor(card);
  const rank = cardRank(card);
  const isWildCard = card === "wild" || card === "wild-draw4";
  const label =
    rank === "skip" ? "⊘" : rank === "reverse" ? "⇄" : rank === "draw2" ? "+2" : rank === "draw4" ? "+4" : rank === "wild" ? "★" : rank;
 
  return (
    <div
      className={[
        "relative flex items-center justify-center rounded-2xl border-[3px] font-extrabold select-none",
        small ? "h-24 w-16 text-2xl" : "h-36 w-24 text-5xl",
        isWildCard
          ? "border-neutral-900 bg-gradient-to-br from-red-500 via-green-500 to-blue-500 text-white"
          : color
            ? COLOR_CLASSES[color]
            : "border-border bg-secondary text-secondary-foreground",
      ].join(" ")}
      style={{ boxShadow: small ? CARD_SHADOW_SMALL : CARD_SHADOW }}
    >
      {/* inner gloss ring, fakes a card's plastic-coated edge */}
      <span className="pointer-events-none absolute inset-1.5 rounded-xl border-2 border-white/60" aria-hidden />
      {/* diagonal top-left sheen */}
      <span
        className="pointer-events-none absolute inset-0 rounded-2xl"
        aria-hidden
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 35%)" }}
      />
      <span className="relative drop-shadow-[0_2px_3px_rgba(0,0,0,0.4)]">{label}</span>
      {!isWildCard && (
        <span className={["absolute left-2 top-1.5 font-bold opacity-90", small ? "text-xs" : "text-sm"].join(" ")}>
          {label}
        </span>
      )}
    </div>
  );
}
 
export function UnoBoard({
  hand,
  topDiscard,
  activeColor,
  deckCount,
  myTurn,
  disabled,
  hasDrawnThisTurn,
  onPlay,
  onDraw,
  onPass,
}: {
  hand: UnoCard[];
  topDiscard: UnoCard;
  activeColor: UnoColor;
  deckCount: number;
  myTurn: boolean;
  disabled?: boolean;
  hasDrawnThisTurn: boolean;
  onPlay: (card: UnoCard, chosenColor?: UnoColor) => void;
  onDraw: () => void;
  onPass: () => void;
}) {
  const [pendingWild, setPendingWild] = useState<UnoCard | null>(null);
 
  const handleCardClick = (card: UnoCard) => {
    if (!myTurn || disabled) return;
    if (!canPlay(card, topDiscard, activeColor)) return;
    if (card === "wild" || card === "wild-draw4") {
      setPendingWild(card);
    } else {
      onPlay(card);
    }
  };
 
  const chooseColor = (c: UnoColor) => {
    if (!pendingWild) return;
    onPlay(pendingWild, c);
    setPendingWild(null);
  };
 
  return (
    <div className="flex w-full flex-col items-center gap-8" style={{ perspective: "1200px" }}>
      {/* deck + discard */}
      <div className="flex items-center gap-8">
        <button
          type="button"
          onClick={onDraw}
          disabled={!myTurn || disabled || hasDrawnThisTurn}
          className="flex flex-col items-center gap-2 transition-transform hover:-translate-y-1 disabled:opacity-40 disabled:hover:translate-y-0"
        >
          <div
            className="flex h-36 w-24 items-center justify-center rounded-2xl border-2 border-dashed border-border bg-secondary/40 text-sm font-semibold text-card-muted"
            style={{ boxShadow: "0 6px 14px rgba(0,0,0,0.18)" }}
          >
            {deckCount}
          </div>
          <span className="text-xs font-medium text-muted-foreground">Draw</span>
        </button>
 
        <div className="flex flex-col items-center gap-2">
          <div style={{ transform: "rotate(-3deg)" }}>
            <CardFace card={topDiscard} />
          </div>
          <span
            className={[
              "mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white shadow",
              COLOR_DOT[activeColor],
            ].join(" ")}
          >
            {activeColor}
          </span>
        </div>
      </div>
 
      {myTurn && hasDrawnThisTurn && !disabled && (
        <button
          type="button"
          onClick={onPass}
          className="rounded-lg border-2 border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
        >
          Pass turn
        </button>
      )}
 
      {pendingWild && (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-border bg-card p-5 shadow-xl">
          <p className="text-sm font-medium text-card-foreground">Choose a color</p>
          <div className="flex gap-3">
            {(["red", "yellow", "green", "blue"] as UnoColor[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => chooseColor(c)}
                className={[
                  "h-12 w-12 rounded-full border-2 border-white/60 shadow-lg transition-transform hover:scale-110",
                  COLOR_DOT[c],
                ].join(" ")}
                aria-label={c}
              />
            ))}
          </div>
        </div>
      )}
 
      {/* hand */}
      <div className="flex flex-wrap justify-center gap-3 pb-2">
        {hand.map((card, i) => {
          const playable = myTurn && !disabled && canPlay(card, topDiscard, activeColor);
          return (
            <button
              key={`${card}-${i}`}
              type="button"
              onClick={() => handleCardClick(card)}
              disabled={!playable}
              className={[
                "transition-transform duration-150 ease-out",
                playable
                  ? "cursor-pointer hover:-translate-y-3 hover:scale-105"
                  : "cursor-default opacity-60",
              ].join(" ")}
              style={{ transformStyle: "preserve-3d" }}
            >
              <CardFace card={card} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
 
