import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function publishableClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export interface RoomSnapshot {
  room: {
    id: string;
    code: string;
    game_type: string;
    status: string;
    host_player_id: string;
    max_players: number;
    created_at: string;
  } | null;
  players: {
    id: string;
    room_id: string;
    player_id: string;
    name: string;
    symbol: string | null;
    seat: number | null;
    ready: boolean;
    joined_at: string;
  }[];
  state: {
    room_id: string;
    board: Record<string, unknown>;
    current_player_id: string | null;
    status: string;
    winner_player_id: string | null;
    draw: boolean;
    last_move: Record<string, unknown> | null;
    move_count: number;
    updated_at: string;
  } | null;
}

export const getRoomByCode = createServerFn({ method: "GET" })
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    const sb = publishableClient();
    const { data: room } = await sb
      .from("rooms")
      .select("id, code, game_type, status, host_player_id, max_players, created_at")
      .eq("code", data.code.toUpperCase())
      .maybeSingle();

    if (!room) {
      return { room: null, players: [], state: null } satisfies RoomSnapshot;
    }

    const [p, s] = await Promise.all([
      sb
        .from("room_players")
        .select("id, room_id, player_id, name, symbol, seat, ready, joined_at")
        .eq("room_id", room.id)
        .order("seat"),
      sb
        .from("game_state")
        .select("room_id, board, current_player_id, status, winner_player_id, draw, last_move, move_count, updated_at")
        .eq("room_id", room.id)
        .maybeSingle(),
    ]);

    return {
      room,
      players: p.data ?? [],
      state: s.data ?? null,
    } satisfies RoomSnapshot;
  });
