import { playGameSound } from "@/lib/game-sounds";
import { useState } from "react";
import {
  COSTS,
  getStealCandidates,
  victoryPoints,
  type CatanState,
  type DevCardType,
  type ResourceType,
} from "@/lib/catan-engine";

const RESOURCE_COLORS: Record<ResourceType | "desert", string> = {
  wood: "#2f6b3a",
  brick: "#b45f3f",
  sheep: "#8bc34a",
  wheat: "#e8c547",
  ore: "#7d8a99",
  desert: "#d9c9a3",
};

const RESOURCE_LABEL: Record<ResourceType, string> = {
  wood: "Wood",
  brick: "Brick",
  sheep: "Sheep",
  wheat: "Wheat",
  ore: "Ore",
};

const TOKEN_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#eab308"];

type Mode = "idle" | "settlement" | "road" | "city" | "robber" | "steal" | "monopoly" | "year-of-plenty" | "road-building";

export function CatanBoard({
  state,
  players,
  myPlayerId,
  myTurn,
  disabled,
  onPlaceSetupSettlement,
  onPlaceSetupRoad,
  onRoll,
  onMoveRobber,
  onSteal,
  onBuildRoad,
  onBuildSettlement,
  onBuildCity,
  onBuyDevCard,
  onPlayKnight,
  onPlayYearOfPlenty,
  onPlayMonopoly,
  onPlayRoadBuilding,
  onBankTrade,
  onEndTurn,
}: {
  state: CatanState;
  players: { id: string; name: string }[];
  myPlayerId: string;
  myTurn: boolean;
  disabled?: boolean;
  onPlaceSetupSettlement: (vertexId: string) => void;
  onPlaceSetupRoad: (edgeId: string) => void;
  onRoll: () => void;
  onMoveRobber: (hexId: string) => void;
  onSteal: (targetId: string) => void;
  onBuildRoad: (edgeId: string) => void;
  onBuildSettlement: (vertexId: string) => void;
  onBuildCity: (vertexId: string) => void;
  onBuyDevCard: () => void;
  onPlayKnight: (hexId: string, stealTargetId?: string) => void;
  onPlayYearOfPlenty: (r1: ResourceType, r2: ResourceType) => void;
  onPlayMonopoly: (r: ResourceType) => void;
  onPlayRoadBuilding: (e1: string, e2: string) => void;
  onBankTrade: (give: ResourceType, get: ResourceType) => void;
  onEndTurn: () => void;
}) {
  const [mode, setMode] = useState<Mode>("idle");
  const [roadBuildingFirst, setRoadBuildingFirst] = useState<string | null>(null);
  const [tradeGive, setTradeGive] = useState<ResourceType>("wood");
  const [tradeGet, setTradeGet] = useState<ResourceType>("brick");
  const [diceKey, setDiceKey] = useState(0);

  const playerColorIdx: Record<string, number> = {};
  players.forEach((p, i) => (playerColorIdx[p.id] = i));

  const me = state.players[myPlayerId];
  const isSetup = state.phase === "setup-settlement" || state.phase === "setup-road";
  const effectiveMode: Mode = state.phase === "setup-settlement" ? "settlement" : state.phase === "setup-road" ? "road" : state.phase === "move-robber" ? "robber" : mode;

  const handleVertexClick = (vertexId: string) => {
    if (!myTurn || disabled) return;
    if (state.phase === "setup-settlement") return onPlaceSetupSettlement(vertexId);
    if (effectiveMode === "settlement") {
      onBuildSettlement(vertexId);
      setMode("idle");
    } else if (effectiveMode === "city") {
      onBuildCity(vertexId);
      setMode("idle");
    }
  };

  const handleEdgeClick = (edgeId: string) => {
    if (!myTurn || disabled) return;
    if (state.phase === "setup-road") return onPlaceSetupRoad(edgeId);
    if (effectiveMode === "road") {
      onBuildRoad(edgeId);
      setMode("idle");
    } else if (effectiveMode === "road-building") {
      if (!roadBuildingFirst) {
        setRoadBuildingFirst(edgeId);
      } else if (roadBuildingFirst !== edgeId) {
        onPlayRoadBuilding(roadBuildingFirst, edgeId);
        setRoadBuildingFirst(null);
        setMode("idle");
      }
    }
  };

  const handleHexClick = (hexId: string) => {
    if (!myTurn || disabled) return;
    if (state.phase === "move-robber") {
      onMoveRobber(hexId);
      return;
    }
    if (mode === "robber") {
      onPlayKnight(hexId);
      setMode("idle");
    }
  };

  const stealCandidates = state.robberPendingSteal ? getStealCandidates(state, myPlayerId) : [];

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <svg viewBox="-260 -220 520 440" className="w-full max-w-[560px]">
        {/* hexes */}
        {state.hexes.map((hex) => {
          const corners = Array.from({ length: 6 }, (_, i) => {
            const angle = (Math.PI / 180) * (60 * i - 30);
            return `${hex.x + 60 * Math.cos(angle)},${hex.y + 60 * Math.sin(angle)}`;
          }).join(" ");
          const clickable = (state.phase === "move-robber" || mode === "robber") && myTurn && !disabled;
          return (
            <g key={hex.id} onClick={() => handleHexClick(hex.id)} className={clickable ? "cursor-pointer hex-glow" : ""}>
              <polygon
                points={corners}
                fill={RESOURCE_COLORS[hex.resource]}
                stroke="#1f2937"
                strokeWidth={1.5}
                opacity={clickable ? 0.85 : 1}
              />
              {hex.number && (
                <>
                  <circle cx={hex.x} cy={hex.y} r={14} fill="#fef3c7" stroke="#1f2937" strokeWidth={1} />
                  <text
                    x={hex.x}
                    y={hex.y + 5}
                    textAnchor="middle"
                    fontSize={hex.number === 6 || hex.number === 8 ? 15 : 13}
                    fontWeight="bold"
                    fill={hex.number === 6 || hex.number === 8 ? "#dc2626" : "#1f2937"}
                  >
                    {hex.number}
                  </text>
                </>
              )}
              {hex.id === state.robberHex && <circle cx={hex.x} cy={hex.y - 24} r={9} fill="#1f2937" stroke="#fff" strokeWidth={1.5} />}
            </g>
          );
        })}

        {/* edges (roads) */}
        {Object.values(state.edges).map((edge) => {
          const v1 = state.vertices[edge.v1]!;
          const v2 = state.vertices[edge.v2]!;
          const buildable =
            !edge.owner &&
            myTurn &&
            !disabled &&
            (effectiveMode === "road" || effectiveMode === "road-building");
          return (
            <line
              key={edge.id}
              x1={v1.x}
              y1={v1.y}
              x2={v2.x}
              y2={v2.y}
              stroke={edge.owner ? TOKEN_COLORS[playerColorIdx[edge.owner] ?? 0] : buildable ? "#94a3b8" : "#cbd5e1"}
              strokeWidth={edge.owner ? 6 : buildable ? 5 : 3}
              strokeLinecap="round"
              opacity={roadBuildingFirst === edge.id ? 0.5 : 1}
              className={buildable ? "cursor-pointer build-pop" : ""}
              onClick={() => handleEdgeClick(edge.id)}
            />
          );
        })}

        {/* vertices (settlements/cities) */}
        {Object.values(state.vertices).map((v) => {
          const buildable =
            myTurn &&
            !disabled &&
            ((effectiveMode === "settlement" && !v.building) || (effectiveMode === "city" && v.building?.owner === myPlayerId && v.building.type === "settlement"));
          if (!v.building && !buildable) {
            return <circle key={v.id} cx={v.x} cy={v.y} r={3} fill="#e2e8f0" />;
          }
          if (!v.building) {
            return (
              <circle
                key={v.id}
                cx={v.x}
                cy={v.y}
                r={7}
                fill="#94a3b8"
                stroke="#fff"
                strokeWidth={1.5}
                className="cursor-pointer"
                onClick={() => handleVertexClick(v.id)}
              />
            );
          }
          const color = TOKEN_COLORS[playerColorIdx[v.building.owner] ?? 0];
          return v.building.type === "city" ? (
            <rect
              key={v.id}
              x={v.x - 8}
              y={v.y - 8}
              width={16}
              height={16}
              fill={color}
              stroke="#fff"
              strokeWidth={1.5}
              className={buildable ? "cursor-pointer" : ""}
              onClick={() => handleVertexClick(v.id)}
            />
          ) : (
            <circle
              key={v.id}
              cx={v.x}
              cy={v.y}
              r={9}
              fill={color}
              stroke="#fff"
              strokeWidth={1.5}
              className={buildable ? "cursor-pointer" : ""}
              onClick={() => handleVertexClick(v.id)}
            />
          );
        })}
      </svg>

      {/* robber steal prompt */}
      {state.robberPendingSteal && myTurn && !disabled && (
        <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-border bg-card p-4">
          <p className="text-sm font-medium text-card-foreground">Steal from whom?</p>
          <div className="flex gap-2">
            {stealCandidates.map((pid) => (
              <button
                key={pid}
                type="button"
                onClick={() => onSteal(pid)}
                className="rounded-lg bg-secondary px-3 py-1.5 text-sm font-medium"
              >
                {players.find((p) => p.id === pid)?.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* my resources */}
      {me && (
        <div className="flex flex-wrap justify-center gap-2">
          {(Object.keys(me.resources) as ResourceType[]).map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm"
              style={{ borderColor: RESOURCE_COLORS[r] }}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: RESOURCE_COLORS[r] }} />
              {RESOURCE_LABEL[r]}: {me.resources[r]}
            </span>
          ))}
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm font-medium">
            🃏 {me.devCards.length}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-sm font-medium text-primary">
            ⭐ {victoryPoints(state, myPlayerId)} VP
          </span>
        </div>
      )}

      {/* action panel */}
      {state.phase === "game-over" ? (
        <p className="text-xl font-bold text-foreground">
          {state.winner === myPlayerId ? "You win!" : `${players.find((p) => p.id === state.winner)?.name ?? "A player"} wins!`}
        </p>
      ) : isSetup ? (
        <p className="text-sm text-card-muted">
          {myTurn
            ? state.phase === "setup-settlement"
              ? "Setup: click an open corner to place a settlement."
              : "Setup: click a road touching your settlement."
            : `Waiting for ${players.find((p) => p.id === state.order[state.turnIndex])?.name}…`}
        </p>
      ) : state.phase === "move-robber" ? (
        <p className="text-sm text-card-muted">
          {myTurn ? "Rolled a 7 — click a hex to move the robber." : "Robber is moving…"}
        </p>
      ) : myTurn && !disabled ? (
        <div className="flex flex-col items-center gap-3">
          {state.lastRoll && (
            <div className="flex gap-2 text-2xl font-bold text-foreground">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-border bg-card">{state.lastRoll[0]}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-border bg-card">{state.lastRoll[1]}</span>
            </div>
          )}

          {state.phase === "roll" ? (
            <button type="button" onClick={() => { setDiceKey(k => k + 1); playGameSound("dice-roll"); onRoll(); }} className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90">
              Roll dice
            </button>
          ) : (
            <>
              <div className="flex flex-wrap justify-center gap-2">
                <ActionButton active={mode === "road"} onClick={() => setMode(mode === "road" ? "idle" : "road")} label="Build road" cost={COSTS.road} />
                <ActionButton active={mode === "settlement"} onClick={() => setMode(mode === "settlement" ? "idle" : "settlement")} label="Build settlement" cost={COSTS.settlement} />
                <ActionButton active={mode === "city"} onClick={() => setMode(mode === "city" ? "idle" : "city")} label="Build city" cost={COSTS.city} />
                <ActionButton active={false} onClick={onBuyDevCard} label="Buy dev card" cost={COSTS.devCard} />
              </div>

              {me && me.devCards.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {(["knight", "year-of-plenty", "monopoly", "road-building"] as DevCardType[])
                    .filter((c) => me.devCards.includes(c))
                    .map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          if (c === "knight") setMode(mode === "robber" ? "idle" : "robber");
                          else if (c === "year-of-plenty") setMode("year-of-plenty");
                          else if (c === "monopoly") setMode("monopoly");
                          else if (c === "road-building") setMode("road-building");
                        }}
                        className={[
                          "rounded-lg border px-2.5 py-1 text-xs font-medium",
                          mode === c || (c === "knight" && mode === "robber") ? "border-primary bg-primary/10" : "border-border",
                        ].join(" ")}
                      >
                        Play {c.replace("-", " ")}
                      </button>
                    ))}
                </div>
              )}

              {mode === "robber" && (
                <p className="text-xs text-card-muted">Click a hex on the board to move the robber (Knight).</p>
              )}

              {mode === "year-of-plenty" && (
                <YearOfPlentyPicker
                  onConfirm={(r1, r2) => {
                    onPlayYearOfPlenty(r1, r2);
                    setMode("idle");
                  }}
                />
              )}

              {mode === "monopoly" && (
                <ResourcePicker
                  onPick={(r) => {
                    onPlayMonopoly(r);
                    setMode("idle");
                  }}
                />
              )}

              {mode === "road-building" && (
                <p className="text-xs text-card-muted">
                  Click two open roads on the board.{roadBuildingFirst ? " First road selected — pick the second." : ""}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-border p-2.5">
                <span className="text-xs text-card-muted">Trade with bank (4:1):</span>
                <ResourceSelect value={tradeGive} onChange={setTradeGive} />
                <span className="text-xs">→</span>
                <ResourceSelect value={tradeGet} onChange={setTradeGet} />
                <button
                  type="button"
                  onClick={() => { playGameSound("trade-success"); onBankTrade(tradeGive, tradeGet); }}
                  disabled={!me || me.resources[tradeGive] < 4 || tradeGive === tradeGet}
                  className="rounded-lg bg-secondary px-3 py-1 text-xs font-medium disabled:opacity-40"
                >
                  Trade
                </button>
              </div>

              <button type="button" onClick={onEndTurn} className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90">
                End turn
              </button>
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-card-muted">Waiting for {players.find((p) => p.id === state.order[state.turnIndex])?.name}…</p>
      )}

      {/* players summary */}
      <div className="flex flex-wrap justify-center gap-3">
        {players.map((p, i) => (
          <div
            key={p.id}
            className={[
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
              state.order[state.turnIndex] === p.id ? "border-primary ring-2 ring-primary/40" : "border-border",
            ].join(" ")}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TOKEN_COLORS[i] }} />
            <span className="font-medium">{p.name}</span>
            <span className="text-card-muted">{victoryPoints(state, p.id)} VP</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionButton({
  active,
  onClick,
  label,
  cost,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  cost: Partial<Record<ResourceType, number>>;
}) {
  const costText = (Object.entries(cost) as [ResourceType, number][]).map(([r, n]) => `${n} ${r}`).join(", ");
  return (
    <button
      type="button"
      onClick={() => { playGameSound("settlement"); onClick(); }}
      title={costText}
      className={["rounded-lg border px-3 py-1.5 text-xs font-medium", active ? "border-primary bg-primary/10" : "border-border"].join(" ")}
    >
      {label}
    </button>
  );
}

function ResourceSelect({ value, onChange }: { value: ResourceType; onChange: (r: ResourceType) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ResourceType)}
      className="rounded-lg border border-border bg-card px-2 py-1 text-xs"
    >
      {(Object.keys(RESOURCE_LABEL) as ResourceType[]).map((r) => (
        <option key={r} value={r}>
          {RESOURCE_LABEL[r]}
        </option>
      ))}
    </select>
  );
}

function ResourcePicker({ onPick }: { onPick: (r: ResourceType) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {(Object.keys(RESOURCE_LABEL) as ResourceType[]).map((r) => (
        <button key={r} type="button" onClick={() => onPick(r)} className="rounded-lg border border-border px-2.5 py-1 text-xs">
          {RESOURCE_LABEL[r]}
        </button>
      ))}
    </div>
  );
}

function YearOfPlentyPicker({ onConfirm }: { onConfirm: (r1: ResourceType, r2: ResourceType) => void }) {
  const [r1, setR1] = useState<ResourceType>("wood");
  const [r2, setR2] = useState<ResourceType>("brick");
  return (
    <div className="flex items-center gap-2">
      <ResourceSelect value={r1} onChange={setR1} />
      <ResourceSelect value={r2} onChange={setR2} />
      <button type="button" onClick={() => onConfirm(r1, r2)} className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
        Confirm
      </button>
    </div>
  );
}
