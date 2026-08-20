create table public.rooms (id uuid primary key default gen_random_uuid(), code text not null unique, game_type text not null, status text not null default 'waiting', host_player_id uuid not null, max_players int not null default 2, created_at timestamptz not null default now());

create table public.room_players (id uuid primary key default gen_random_uuid(), room_id uuid not null references public.rooms(id) on delete cascade, player_id uuid not null, name text not null, symbol text, seat int, ready boolean not null default false, joined_at timestamptz not null default now(), unique(room_id, player_id));

create table public.game_state (room_id uuid primary key references public.rooms(id) on delete cascade, board jsonb not null default '{}'::jsonb, current_player_id uuid, status text not null default 'waiting', winner_player_id uuid, draw boolean not null default false, last_move jsonb, move_count int not null default 0, updated_at timestamptz not null default now());

grant select, insert, update, delete on public.rooms to anon;
grant select, insert, update, delete on public.rooms to authenticated;
grant all on public.rooms to service_role;
grant select, insert, update, delete on public.room_players to anon;
grant select, insert, update, delete on public.room_players to authenticated;
grant all on public.room_players to service_role;
grant select, insert, update, delete on public.game_state to anon;
grant select, insert, update, delete on public.game_state to authenticated;
grant all on public.game_state to service_role;

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;
alter table public.game_state enable row level security;

create policy "rooms sel" on public.rooms for select using (true);
create policy "rooms ins" on public.rooms for insert with check (true);
create policy "rooms upd" on public.rooms for update using (true);
create policy "rooms del" on public.rooms for delete using (true);
create policy "players sel" on public.room_players for select using (true);
create policy "players ins" on public.room_players for insert with check (true);
create policy "players upd" on public.room_players for update using (true);
create policy "players del" on public.room_players for delete using (true);
create policy "state sel" on public.game_state for select using (true);
create policy "state ins" on public.game_state for insert with check (true);
create policy "state upd" on public.game_state for update using (true);
create policy "state del" on public.game_state for delete using (true);

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_players;
alter publication supabase_realtime add table public.game_state;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger trg_game_state_touch before update on public.game_state for each row execute function public.touch_updated_at();

create or replace function public.assign_seat() returns trigger language plpgsql as $$ declare next_seat int; begin select coalesce(max(seat), -1) + 1 into next_seat from public.room_players where room_id = new.room_id; new.seat = next_seat; if new.symbol is null then new.symbol = case next_seat % 2 when 0 then 'X' else 'O' end; end if; return new; end $$;
create trigger trg_room_players_seat before insert on public.room_players for each row execute function public.assign_seat();