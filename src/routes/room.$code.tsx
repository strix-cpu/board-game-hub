import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchRoomData,
  getPlayerId,
  inviteLink,
  type PlayerRow,
  type RoomRow,
  type GameStateRow,
} from "@/lib/game-hub";
import {
  cfDrop,
  cfInit,
  cfWinner,
  gameMeta,
  initBoard,
  tttInit,
  tttWinner,
  type CFBoard,
  type PlayerSymbol,
  type TTTBoard,
} from "@/lib/game-engine";
import {
  checkWinner as unoCheckWinner,
  currentPlayerId as unoCurrentPlayerId,
  drawForTurn as unoDrawForTurn,
  hasPlayableCard as unoHasPlayableCard,
  initUno,
  passTurn as unoPassTurn,
  playCard as unoPlayCard,
  type UnoCard,
  type UnoColor,
  type UnoState,
} from "@/lib/uno-engine";
import { getRoomByCode } from "@/lib/rooms.functions";
import { TicTacToeBoard } from "@/components/games/TicTacToeBoard";
import { ConnectFourBoard } from "@/components/games/ConnectFourBoard";
import { UnoBoard } from "@/components/games/UnoBoard";
 
export const Route = createFileRoute("/room/$code")({
  loader: async ({ params }) => {
    const res = await getRoomByCode({ data: { code: params.code } });
    if (!res.room) throw notFound();
    return res;
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `Room ${loaderData?.room?.code ?? ""} — Game Night`,
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RoomPage,
});
 
function RoomPage() {
  const initial = Route.useLoaderData();
  const navigate = useNavigate();
  const playerId = getPlayerId();
  const meta = useMemo(() => gameMeta(initial.room.game_type), [initial.room]);
  const isUno = initial.room.game_type === "uno";
 
  const [room, setRoom] = useState<RoomRow>(initial.room);
  const [players, setPlayers] = useState<PlayerRow[]>(initial.players);
  const [state, setState] = useState<GameStateRow | null>(initial.state);
  const [copied, setCopied] = useState(false);
  const [hasDrawnThisTurn, setHasDrawnThisTurn] = useState(false);
 
  // realtime subscriptions
  useEffect(() => {
    const roomId = room.id;
    const refresh = async () => {
      const data = await fetchRoomData(roomId);
      setPlayers(data.players);
      if (data.state) setState(data.state);
      const { data: r } = await supabase
        .from("rooms")
        .select("id, code, game_type, status, host_player_id, max_players, created_at")
        .eq("id", roomId)
        .maybeSingle<RoomRow>();
      if (r) setRoom(r);
    };
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_state", filter: `room_id=eq.${roomId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        refresh,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id]);
 
  // reset "drawn this turn" flag whenever the active player changes
  useEffect(() => {
    setHasDrawnThisTurn(false);
  }, [state?.current_player_id]);
 
  if (!meta) {
    return (
      <div className="p-10 text-center text-muted-foreground">Unknown game type.</div>
    );
  }
 
  const me = players.find((p) => p.player_id === playerId);
  const isHost = room.host_player_id === playerId;
  const mySymbol = (me?.symbol ?? null) as PlayerSymbol | null;
  const myTurn =
    room.status === "playing" && state?.current_player_id === playerId;
 
  // ---- board parsing ----
  const tttCells: TTTBoard = useMemo(() => {
    const b = state?.board as { cells?: TTTBoard } | undefined;
    return b?.cells ?? tttInit();
  }, [state]);
  const cfGrid: CFBoard = useMemo(() => {
    const b = state?.board as { grid?: CFBoard } | undefined;
    return b?.grid ?? cfInit(meta.rows, meta.cols);
  }, [state, meta]);
  const unoState: UnoState | null = useMemo(() => {
    if (!isUno) return null;
    const b = state?.board as UnoState | undefined;
    return b && b.hands ? b : null;
  }, [state, isUno]);
 
  const tttResult = useMemo(() => tttWinner(tttCells), [tttCells]);
  const cfResult = useMemo(() => cfWinner(cfGrid), [cfGrid]);
 
  const winnerSymbol: PlayerSymbol | null =
    initial.room.game_type === "tic-tac-toe"
      ? tttResult.winner
      : initial.room.game_type === "connect-four"
        ? cfResult.winner
        : null;
  const isDraw =
    initial.room.game_type === "tic-tac-toe"
      ? tttResult.draw
      : initial.room.game_type === "connect-four"
        ? cfResult.draw
        : false;
  const unoWinnerName = isUno
    ? players.find((p) => p.player_id === state?.winner_player_id)?.name ?? null
    : null;
 
  // ---- actions ----
  const toggleReady = async () => {
    if (!me) return;
    await supabase
      .from("room_players")
      .update({ ready: !me.ready })
      .eq("id", me.id);
  };
 
  const startGame = async () => {
    if (!isHost) return;
    if (players.length < meta.minPlayers) return;
    const first = players[0];
    if (!first) return;
 
    if (isUno) {
      const board = initUno(players.map((p) => p.player_id));
      await supabase
        .from("game_state")
        .update({
          board,
          current_player_id: unoCurrentPlayerId(board),
          status: "playing",
          winner_player_id: null,
          draw: false,
          last_move: null,
          move_count: 0,
        })
        .eq("room_id", room.id);
      await supabase.from("rooms").update({ status: "playing" }).eq("id", room.id);
      return;
    }
 
    const board = initBoard(initial.room.game_type, meta);
    await supabase
      .from("game_state")
      .update({
        board,
        current_player_id: first.player_id,
        status: "playing",
        winner_player_id: null,
        draw: false,
        last_move: null,
        move_count: 0,
      })
      .eq("room_id", room.id);
    await supabase.from("rooms").update({ status: "playing" }).eq("id", room.id);
  };
 
  const playAgain = async () => {
    if (!isHost) return;
    const first = players[0];
    if (!first) return;
 
    if (isUno) {
      const board = initUno(players.map((p) => p.player_id));
      await supabase
        .from("game_state")
        .update({
          board,
          current_player_id: unoCurrentPlayerId(board),
          status: "playing",
          winner_player_id: null,
          draw: false,
          last_move: null,
          move_count: 0,
        })
        .eq("room_id", room.id);
      await supabase.from("rooms").update({ status: "playing" }).eq("id", room.id);
      return;
    }
 
    const board = initBoard(initial.room.game_type, meta);
    await supabase
      .from("game_state")
      .update({
        board,
        current_player_id: first.player_id,
        status: "playing",
        winner_player_id: null,
        draw: false,
        last_move: null,
        move_count: 0,
      })
      .eq("room_id", room.id);
    await supabase.from("rooms").update({ status: "playing" }).eq("id", room.id);
  };
 
  const makeMove = async (move: number) => {
    if (!myTurn || !mySymbol || !state) return;
    if (initial.room.game_type === "tic-tac-toe") {
      const cells = tttCells.slice();
      if (cells[move]) return;
      cells[move] = mySymbol;
      const res = tttWinner(cells);
      const nextPlayer = players.find((p) => p.player_id !== playerId);
      await supabase
        .from("game_state")
        .update({
          board: { cells },
          current_player_id: res.winner || res.draw ? state.current_player_id : (nextPlayer?.player_id ?? null),
          status: res.winner || res.draw ? "finished" : "playing",
          winner_player_id: res.winner ? playerId : null,
          draw: res.draw,
          last_move: { index: move },
          move_count: (state.move_count ?? 0) + 1,
        })
        .eq("room_id", room.id);
      if (res.winner || res.draw) {
        await supabase.from("rooms").update({ status: "finished" }).eq("id", room.id);
      }
    }
  };
 
  const dropPiece = async (col: number) => {
    if (!myTurn || !mySymbol || !state) return;
    if (initial.room.game_type !== "connect-four") return;
    const drop = cfDrop(cfGrid, col, mySymbol);
    if (!drop) return;
    const res = cfWinner(drop.board);
    const nextPlayer = players.find((p) => p.player_id !== playerId);
    await supabase
      .from("game_state")
      .update({
        board: { grid: drop.board },
        current_player_id: res.winner || res.draw ? state.current_player_id : (nextPlayer?.player_id ?? null),
        status: res.winner || res.draw ? "finished" : "playing",
        winner_player_id: res.winner ? playerId : null,
        draw: res.draw,
        last_move: { col, row: drop.row },
        move_count: (state.move_count ?? 0) + 1,
      })
      .eq("room_id", room.id);
    if (res.winner || res.draw) {
      await supabase.from("rooms").update({ status: "finished" }).eq("id", room.id);
    }
  };
 
  const playUnoCard = async (card: UnoCard, chosenColor?: UnoColor) => {
    if (!myTurn || !unoState || !state) return;
    const next = unoPlayCard(unoState, playerId, card, chosenColor);
    if (!next) return;
    const winner = unoCheckWinner(next);
    await supabase
      .from("game_state")
      .update({
        board: next,
        current_player_id: winner ? state.current_player_id : unoCurrentPlayerId(next),
        status: winner ? "finished" : "playing",
        winner_player_id: winner,
        draw: false,
        last_move: { card },
        move_count: (state.move_count ?? 0) + 1,
      })
      .eq("room_id", room.id);
    if (winner) {
      await supabase.from("rooms").update({ status: "finished" }).eq("id", room.id);
    }
    setHasDrawnThisTurn(false);
  };
 
  const drawUnoCard = async () => {
    if (!myTurn || !unoState || !state || hasDrawnThisTurn) return;
    const next = unoDrawForTurn(unoState, playerId);
    if (!next) return;
    const stillPlayable = unoHasPlayableCard(next, playerId);
    const finalState = stillPlayable ? next : unoPassTurn(next);
    await supabase
      .from("game_state")
      .update({
        board: finalState,
        current_player_id: unoCurrentPlayerId(finalState),
        last_move: { drew: true },
        move_count: (state.move_count ?? 0) + 1,
      })
      .eq("room_id", room.id);
    setHasDrawnThisTurn(stillPlayable);
  };
 
  const passUnoTurn = async () => {
    if (!myTurn || !unoState || !state) return;
    const next = unoPassTurn(unoState);
    await supabase
      .from("game_state")
      .update({
        board: next,
        current_player_id: unoCurrentPlayerId(next),
        move_count: (state.move_count ?? 0) + 1,
      })
      .eq("room_id", room.id);
    setHasDrawnThisTurn(false);
  };
 
  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink(room.code));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };
 
  const allReady = players.length >= meta.minPlayers && players.every((p) => p.ready);
  const finished = room.status === "finished";
 
  return (
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-6 sm:py-10">
      {/* top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Leave
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{meta.emoji}</span>
          <div className="leading-tight">
            <div className="font-semibold text-foreground">{meta.name}</div>
            <div className="text-xs text-muted-foreground">
              {players.length}/{room.max_players} players
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={copyInvite}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/70"
        >
          <span className="font-mono tracking-widest">{room.code}</span>
          <span className="text-xs text-muted-foreground">
            {copied ? "Copied!" : "Copy link"}
          </span>
        </button>
      </div>
 
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* table */}
        <div className="felt rounded-2xl p-5 sm:p-7">
          {room.status === "waiting" ? (
            <Lobby players={players} meta={meta} me={me} playerId={playerId} />
          ) : (
            <div className="flex flex-col items-center">
              {initial.room.game_type === "tic-tac-toe" && (
                <TicTacToeBoard
                  cells={tttCells}
                  winningLine={tttResult.line}
                  onMove={makeMove}
                  myTurn={myTurn}
                  disabled={finished}
                />
              )}
              {initial.room.game_type === "connect-four" && (
                <ConnectFourBoard
                  grid={cfGrid}
                  winningCells={cfResult.cells}
                  onMove={dropPiece}
                  myTurn={myTurn}
                  disabled={finished}
                />
              )}
              {isUno && unoState && (
                <UnoBoard
                  hand={unoState.hands[playerId] ?? []}
                  topDiscard={unoState.discard[unoState.discard.length - 1]!}
                  activeColor={unoState.color}
                  deckCount={unoState.deck.length}
                  myTurn={myTurn}
                  disabled={finished}
                  hasDrawnThisTurn={hasDrawnThisTurn}
                  onPlay={playUnoCard}
                  onDraw={drawUnoCard}
                  onPass={passUnoTurn}
                />
              )}
 
              {finished && (
                <div className="mt-6 text-center">
                  {isUno ? (
                    unoWinnerName && (
                      <p className="text-2xl font-bold text-foreground">
                        {state?.winner_player_id === playerId ? "You win!" : `${unoWinnerName} wins!`}
                      </p>
                    )
                  ) : winnerSymbol ? (
                    <p className="text-2xl font-bold text-foreground">
                      {winnerSymbol === mySymbol ? "You win!" : `${winnerSymbol} wins!`}
                    </p>
                  ) : isDraw ? (
                    <p className="text-2xl font-bold text-foreground">It's a draw!</p>
                  ) : null}
                  {isHost ? (
                    <button
                      type="button"
                      onClick={playAgain}
                      className="mt-4 rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Play again
                    </button>
                  ) : (
                    <p className="mt-4 text-sm text-card-muted">
                      Waiting for the host to start a new round…
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
 
        {/* side panel */}
        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border-2 border-border bg-card p-4 text-card-foreground">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-card-muted">
              Players
            </h2>
            <ul className="mt-3 space-y-2">
              {players.map((p) => {
                const sym = p.symbol as PlayerSymbol | null;
                const isMe = p.player_id === playerId;
                const active =
                  room.status === "playing" && state?.current_player_id === p.player_id;
                const handCount = unoState?.hands[p.player_id]?.length;
                return (
                  <li
                    key={p.id}
                    className={[
                      "flex items-center justify-between rounded-lg px-3 py-2",
                      active ? "bg-primary/15 ring-1 ring-primary/40" : "bg-secondary/30",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2">
                      {isUno ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                          {handCount ?? "?"}
                        </span>
                      ) : (
                        <span
                          className={[
                            "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold",
                            sym === "X"
                              ? "bg-player-x/20 text-player-x"
                              : sym === "O"
                                ? "bg-player-o/20 text-player-o"
                                : "bg-secondary text-secondary-foreground",
                          ].join(" ")}
                        >
                          {sym ?? "?"}
                        </span>
                      )}
                      <span className="font-medium">
                        {p.name}
                        {isMe && <span className="text-card-muted"> (you)</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {p.player_id === room.host_player_id && (
                        <span className="text-xs text-primary">👑</span>
                      )}
                      {room.status === "waiting" &&
                        (p.ready ? (
                          <span className="text-xs text-primary">✓ ready</span>
                        ) : (
                          <span className="text-xs text-card-muted">…</span>
                        ))}
                      {active && (
                        <span className="text-xs font-medium text-primary">turn</span>
                      )}
                    </div>
                  </li>
                );
              })}
              {players.length < meta.maxPlayers && room.status === "waiting" && (
                <li className="rounded-lg border border-dashed border-border px-3 py-2 text-center text-sm text-card-muted">
                  Waiting for {meta.maxPlayers - players.length} more…
                </li>
              )}
            </ul>
          </div>
 
          {room.status === "waiting" && (
            <div className="rounded-2xl border-2 border-border bg-card p-4 text-card-foreground">
              <button
                type="button"
                onClick={toggleReady}
                disabled={!me}
                className={[
                  "w-full rounded-xl py-2.5 font-semibold transition-colors",
                  me?.ready
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                ].join(" ")}
              >
                {me?.ready ? "Not ready" : "I'm ready"}
              </button>
              {isHost && (
                <button
                  type="button"
                  onClick={startGame}
                  disabled={!allReady}
                  className="mt-2 w-full rounded-xl border-2 border-primary py-2.5 font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-40"
                >
                  Start game
                </button>
              )}
              {!isHost && (
                <p className="mt-2 text-center text-xs text-card-muted">
                  The host will start the game.
                </p>
              )}
              <div className="mt-3 rounded-lg bg-secondary/30 p-3 text-sm text-card-muted">
                <p className="font-medium text-secondary-foreground">How to play</p>
                <p className="mt-1">
                  Share the room code <span className="font-mono">{room.code}</span> with your
                  friends. Once everyone's ready, the host starts the game.
                </p>
              </div>
            </div>
          )}
 
          {room.status === "playing" && (
            <div className="rounded-2xl border-2 border-border bg-card p-4 text-center text-card-foreground">
              <p className="text-sm text-card-muted">
                {myTurn ? (
                  <span className="font-semibold text-primary">Your turn!</span>
                ) : (
                  <>
                    Waiting on{" "}
                    <span className="font-semibold">
                      {players.find((p) => p.player_id === state?.current_player_id)?.name}
                    </span>
                    …
                  </>
                )}
              </p>
              {!isUno && (
                <p className="mt-1 text-xs text-card-muted">
                  You play{" "}
                  <span className={mySymbol === "X" ? "font-semibold text-player-x" : "font-semibold text-player-o"}>
                    {mySymbol}
                  </span>
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
 
function Lobby({
  players,
  meta,
  me,
  playerId,
}: {
  players: PlayerRow[];
  meta: ReturnType<typeof gameMeta>;
  me: PlayerRow | undefined;
  playerId: string;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
      <div className="text-6xl">{meta?.emoji}</div>
      <h2 className="mt-4 text-3xl font-bold text-foreground">{meta?.name}</h2>
      <p className="mt-2 text-muted-foreground">{meta?.tagline}</p>
      <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-secondary/40 px-4 py-2 text-sm text-secondary-foreground">
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
        Waiting for players to ready up…
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        {players.length}/{meta?.maxPlayers} joined · {me ? "you're in" : `you're ${playerId.slice(0, 4)}`}
      </p>
    </div>
  );
}
 
