import { supabase } from "@/integrations/supabase/client";
import { GAMES, gameMeta, type GameTypeMeta } from "./game-engine";

const PLAYER_ID_KEY = "bg_player_id";
const PLAYER_NAME_KEY = "bg_player_name";

export function getPlayerId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export function getPlayerName(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(PLAYER_NAME_KEY) ?? "";
}

export function setPlayerName(name: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PLAYER_NAME_KEY, name);
}

export { GAMES, gameMeta, type GameTypeMeta };

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 5; i++) s += chars[Math.floor(Math.random() * chars.length)]!;
  return s;
}

export interface RoomRow {
  id: string;
  code: string;
  game_type: string;
  status: string;
  host_player_id: string;
  max_players: number;
  created_at: string;
}

export interface PlayerRow {
  id: string;
  room_id: string;
  player_id: string;
  name: string;
  symbol: string | null;
  seat: number | null;
  ready: boolean;
  joined_at: string;
}

export interface GameStateRow {
  room_id: string;
  board: Record<string, unknown>;
  current_player_id: string | null;
  status: string;
  winner_player_id: string | null;
  draw: boolean;
  last_move: Record<string, unknown> | null;
  move_count: number;
  updated_at: string;
}

export async function createRoom(
  gameType: string,
  hostName: string,
): Promise<{ code: string; playerId: string }> {
  const playerId = getPlayerId();
  const meta = gameMeta(gameType);
  if (!meta) throw new Error("Unknown game type");
  const code = genCode();

  const { data: room, error } = await supabase
    .from("rooms")
    .insert({
      code,
      game_type: gameType,
      status: "waiting",
      host_player_id: playerId,
      max_players: meta.maxPlayers,
    })
    .select()
    .single<RoomRow>();

  if (error || !room) throw error ?? new Error("Failed to create room");

  const { error: pErr } = await supabase.from("room_players").insert({
    room_id: room.id,
    player_id: playerId,
    name: hostName,
  });
  if (pErr) throw pErr;

  const { error: sErr } = await supabase.from("game_state").insert({
    room_id: room.id,
    board: {},
    status: "waiting",
  });
  if (sErr) throw sErr;

  return { code, playerId };
}

export async function joinRoom(
  code: string,
  name: string,
): Promise<{ ok: boolean; error?: string }> {
  const playerId = getPlayerId();
  const { data: room } = await supabase
    .from("rooms")
    .select("id, max_players")
    .eq("code", code.toUpperCase())
    .maybeSingle<RoomRow>();

  if (!room) return { ok: false, error: "No room found with that code." };

  const { data: existing } = await supabase
    .from("room_players")
    .select("id")
    .eq("room_id", room.id)
    .eq("player_id", playerId)
    .maybeSingle();

  if (!existing) {
    const { count } = await supabase
      .from("room_players")
      .select("id", { count: "exact", head: true })
      .eq("room_id", room.id);
    if ((count ?? 0) >= room.max_players) {
      return { ok: false, error: "That room is full." };
    }
    const { error: insErr } = await supabase
      .from("room_players")
      .insert({ room_id: room.id, player_id: playerId, name });
    if (insErr) return { ok: false, error: insErr.message };
  }
  return { ok: true };
}

export async function fetchRoomData(roomId: string) {
  const [p, s] = await Promise.all([
    supabase
      .from("room_players")
      .select("id, room_id, player_id, name, symbol, seat, ready, joined_at")
      .eq("room_id", roomId)
      .order("seat"),
    supabase
      .from("game_state")
      .select("room_id, board, current_player_id, status, winner_player_id, draw, last_move, move_count, updated_at")
      .eq("room_id", roomId)
      .maybeSingle(),
  ]);
  return {
    players: (p.data as PlayerRow[]) ?? [],
    state: (s.data as GameStateRow | null) ?? null,
  };
}

export function inviteLink(code: string): string {
  if (typeof window === "undefined") return `/room/${code}`;
  return `${window.location.origin}/room/${code}`;
}
