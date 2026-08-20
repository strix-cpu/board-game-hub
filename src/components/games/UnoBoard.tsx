import { useState } from "react";
import { canPlay, cardColor, cardRank, type UnoCard, type UnoColor } from "@/lib/uno-engine";
 
const COLOR_CLASSES: Record<UnoColor, string> = {
  red: "bg-red-500 text-white border-red-600",
  yellow: "bg-yellow-400 text-yellow-950 border-yellow-500",
  green: "bg-green-500 text-white border-green-600",
  blue: "bg-blue-500 text-white border-blue-600",
};
 
const COLOR_DOT: Record<UnoColor, string> = {
  red: "bg-red-500",
  yellow: "bg-yellow-400",
  green: "bg-green-500",
  blue: "bg-blue-500",
};
 
function CardFace({ card, small }: { card: UnoCard; small?: boolean }) {
  const color = cardColor(card);
  const rank = cardRank(card);
  const isWildCard = card === "wild" || card === "wild-draw4";
  const label =
    rank === "skip" ? "⊘" : rank === "reverse" ? "⇄" : rank === "draw2" ? "+2" : rank === "draw4" ? "+4" : rank === "wild" ? "★" : rank;
 
  return (
    <div
      className={[
        "flex items-center justify-center rounded-lg border-2 font-bold shadow-sm select-none",
        small ? "h-14 w-10 text-base" : "h-24 w-16 text-2xl",
        isWildCard
          ? "border-neutral-700 bg-gradient-to-br from-red-500 via-green-500 to-blue-500 text-white"
          : color
            ? COLOR_CLASSES[color]
            : "border-border bg-secondary text-secondary-foreground",
      ].join(" ")}
    >
      {label}
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
    <div className="flex w-full flex-col items-center gap-6">
      {/* deck + discard */}
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={onDraw}
          disabled={!myTurn || disabled || hasDrawnThisTurn}
          className="flex flex-col items-center gap-1.5 disabled:opacity-40"
        >
          <div className="flex h-24 w-16 items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/40 text-xs font-medium text-card-muted">
            {deckCount}
          </div>
          <span className="text-xs text-muted-foreground">Draw</span>
        </button>
 
        <div className="flex flex-col items-center gap-1.5">
          <CardFace card={topDiscard} />
          <span
            className={[
              "mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-white",
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
        <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-border bg-card p-4">
          <p className="text-sm font-medium text-card-foreground">Choose a color</p>
          <div className="flex gap-2">
            {(["red", "yellow", "green", "blue"] as UnoColor[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => chooseColor(c)}
                className={["h-10 w-10 rounded-full border-2 border-white/50 shadow", COLOR_DOT[c]].join(" ")}
                aria-label={c}
              />
            ))}
          </div>
        </div>
      )}
 
      {/* hand */}
      <div className="flex flex-wrap justify-center gap-2">
        {hand.map((card, i) => {
          const playable = myTurn && !disabled && canPlay(card, topDiscard, activeColor);
          return (
            <button
              key={`${card}-${i}`}
              type="button"
              onClick={() => handleCardClick(card)}
              disabled={!playable}
              className={[
                "transition-transform",
                playable ? "cursor-pointer hover:-translate-y-1.5" : "cursor-default opacity-60",
              ].join(" ")}
            >
              <CardFace card={card} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
 
