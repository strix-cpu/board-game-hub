import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GAMES, createRoom, getPlayerName, joinRoom, setPlayerName } from "@/lib/game-hub";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Game Night — Play board games with friends & family" },
      {
        name: "description",
        content:
          "A cozy online board game hub. Create a room, share the code, and play Tic-Tac-Toe, Connect Four and more with your friends and family — live, in real time.",
      },
      { property: "og:title", content: "Game Night — Play board games with friends & family" },
      {
        property: "og:description",
        content:
          "Create a room, share the code, and play board games with friends and family — live, in real time.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [name, setName] = useState(getPlayerName());
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ensureName = () => {
    const trimmed = name.trim() || "Player";
    setName(trimmed);
    setPlayerName(trimmed);
    return trimmed;
  };

  const onCreate = async (gameId: string) => {
    setError(null);
    setBusy(gameId);
    try {
      const host = ensureName();
      const { code } = await createRoom(gameId, host);
      await navigate({ to: "/room/$code", params: { code } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the room.");
    } finally {
      setBusy(null);
    }
  };

  const onJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setBusy("join");
    try {
      const host = ensureName();
      const res = await joinRoom(code, host);
      if (!res.ok) {
        setError(res.error ?? "Couldn't join that room.");
        return;
      }
      await navigate({ to: "/room/$code", params: { code } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't join that room.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-5 py-10 sm:py-16">
      <header className="flex flex-col items-center text-center">
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          🎲 Friends & family game night
        </span>
        <h1 className="text-5xl font-bold text-foreground sm:text-6xl">
          Game Night
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Pick a game, create a room, and share the code. Everyone plays together
          live — no sign-up needed.
        </p>
      </header>

      {/* your name */}
      <section className="mx-auto mt-10 max-w-md">
        <label
          htmlFor="player-name"
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          Your name
        </label>
        <input
          id="player-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What should we call you?"
          className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-card-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </section>

      {/* game selection */}
      <section className="mt-10">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Choose a game
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {GAMES.map((g) => (
            <button
              key={g.id}
              type="button"
              disabled={busy !== null}
              onClick={() => onCreate(g.id)}
              className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card p-6 text-left transition-all hover:-translate-y-1 hover:border-primary hover:shadow-2xl disabled:opacity-60"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-4xl">{g.emoji}</div>
                  <h3 className="mt-3 text-2xl font-bold text-card-foreground">
                    {g.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{g.tagline}</p>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                  {g.minPlayers === g.maxPlayers
                    ? `${g.maxPlayers} players`
                    : `${g.minPlayers}–${g.maxPlayers} players`}
                </span>
              </div>
              <div className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                {busy === g.id ? "Creating…" : "Create room"}
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* join */}
      <section className="mx-auto mt-12 max-w-md rounded-2xl border-2 border-border bg-secondary/40 p-6">
        <h2 className="text-lg font-bold text-secondary-foreground">
          Have a room code?
        </h2>
        <form onSubmit={onJoin} className="mt-3 flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABC23"
            maxLength={6}
            className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-lg font-semibold tracking-widest text-card-foreground uppercase placeholder:tracking-normal placeholder:font-normal placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy === "join"}
            className="rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {busy === "join" ? "Joining…" : "Join"}
          </button>
        </form>
      </section>

      {error && (
        <p className="mx-auto mt-6 max-w-md rounded-lg bg-destructive/15 px-4 py-2 text-center text-sm font-medium text-destructive-foreground">
          {error}
        </p>
      )}

      <footer className="mt-16 text-center text-sm text-muted-foreground">
        More games coming soon — Connect Four today, with Checkers, Ludo and
        bigger titles on the way.
      </footer>
    </div>
  );
}
