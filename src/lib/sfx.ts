// Tiny synthesized sound-effect engine (Web Audio, no asset files).
// Every sound is generated procedurally so the app ships zero audio downloads.

export type SfxName =
  | "click"
  | "hover"
  | "dice"
  | "hop"
  | "coin"
  | "buy"
  | "build"
  | "card"
  | "trade"
  | "robber"
  | "jail"
  | "error"
  | "turn"
  | "win"
  | "lose";

const MUTE_KEY = "bg_sfx_muted";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
const listeners = new Set<(m: boolean) => void>();

export function isMuted(): boolean {
  return muted;
}

export function initSfxPreference(): void {
  if (typeof window === "undefined") return;
  muted = window.localStorage.getItem(MUTE_KEY) === "1";
  emit();
}

export function setMuted(next: boolean): void {
  muted = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  }
  if (master && ctx) master.gain.setTargetAtTime(next ? 0 : 0.9, ctx.currentTime, 0.02);
  emit();
}

export function subscribeMuted(fn: (m: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) fn(muted);
}

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface ToneOptions {
  freq: number;
  to?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  attack?: number;
}

function tone({ freq, to, dur = 0.14, type = "sine", gain = 0.18, delay = 0, attack = 0.008 }: ToneOptions) {
  const ac = audio();
  if (!ac || !master) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to && to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function noise({ dur = 0.2, gain = 0.14, delay = 0, hp = 600, lp = 6000 }: { dur?: number; gain?: number; delay?: number; hp?: number; lp?: number }) {
  const ac = audio();
  if (!ac || !master) return;
  const t0 = ac.currentTime + delay;
  const frames = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const high = ac.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = hp;
  const low = ac.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = lp;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(high).connect(low).connect(g).connect(master);
  src.start(t0);
}

const RECIPES: Record<SfxName, () => void> = {
  click: () => tone({ freq: 520, to: 640, dur: 0.07, type: "triangle", gain: 0.1 }),
  hover: () => tone({ freq: 880, dur: 0.04, type: "sine", gain: 0.04 }),
  dice: () => {
    for (let i = 0; i < 5; i++) {
      noise({ dur: 0.07, gain: 0.12, delay: i * 0.075, hp: 900, lp: 5200 });
      tone({ freq: 180 + Math.random() * 120, dur: 0.05, type: "square", gain: 0.05, delay: i * 0.075 });
    }
  },
  hop: () => tone({ freq: 400, to: 720, dur: 0.09, type: "triangle", gain: 0.1 }),
  coin: () => {
    tone({ freq: 1180, dur: 0.1, type: "triangle", gain: 0.11 });
    tone({ freq: 1560, dur: 0.16, type: "triangle", gain: 0.09, delay: 0.06 });
  },
  buy: () => {
    tone({ freq: 523, dur: 0.12, type: "triangle", gain: 0.13 });
    tone({ freq: 784, dur: 0.14, type: "triangle", gain: 0.12, delay: 0.09 });
    tone({ freq: 1046, dur: 0.2, type: "sine", gain: 0.1, delay: 0.18 });
  },
  build: () => {
    noise({ dur: 0.12, gain: 0.1, hp: 300, lp: 2400 });
    tone({ freq: 220, to: 160, dur: 0.16, type: "square", gain: 0.09 });
  },
  card: () => noise({ dur: 0.22, gain: 0.09, hp: 1800, lp: 9000 }),
  trade: () => {
    tone({ freq: 660, dur: 0.1, type: "sine", gain: 0.1 });
    tone({ freq: 880, dur: 0.12, type: "sine", gain: 0.1, delay: 0.08 });
  },
  robber: () => tone({ freq: 300, to: 90, dur: 0.4, type: "sawtooth", gain: 0.1 }),
  jail: () => {
    noise({ dur: 0.3, gain: 0.12, hp: 200, lp: 1600 });
    tone({ freq: 150, to: 70, dur: 0.35, type: "square", gain: 0.09 });
  },
  error: () => tone({ freq: 200, to: 120, dur: 0.2, type: "sawtooth", gain: 0.1 }),
  turn: () => {
    tone({ freq: 740, dur: 0.1, type: "sine", gain: 0.1 });
    tone({ freq: 988, dur: 0.16, type: "sine", gain: 0.09, delay: 0.09 });
  },
  win: () => {
    [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, dur: 0.3, type: "triangle", gain: 0.12, delay: i * 0.11 }));
  },
  lose: () => {
    [440, 392, 330, 262].forEach((f, i) => tone({ freq: f, dur: 0.28, type: "sine", gain: 0.1, delay: i * 0.12 }));
  },
};

export function playSfx(name: SfxName): void {
  if (muted) return;
  try {
    RECIPES[name]?.();
  } catch {
    /* audio unavailable — silently ignore */
  }
}
