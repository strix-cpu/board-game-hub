export type GameSoundEvent =
  | "dice-roll" | "money-gain" | "money-loss" | "rent-receive" | "rent-pay"
  | "jail-in" | "jail-out" | "doubles" | "card-draw" | "property-buy"
  | "mortgage" | "trade-success" | "trade-declined"
  | "road" | "city" | "settlement" | "resources" | "dev-card" | "seven"
  | "robber" | "longest-road" | "largest-army";

// Lightweight built-in feedback until final audio assets are added.
// Keeping this in one place lets us replace tones with real sound files later.
export function playGameSound(event: GameSoundEvent) {
  if (typeof window === "undefined" || !("AudioContext" in window || "webkitAudioContext" in window)) return;
  try {
    const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    const ctx = new Ctx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    const map: Record<GameSoundEvent, [number, number]> = {
      "dice-roll": [180, 0.08], "money-gain": [660, 0.12], "money-loss": [220, 0.14],
      "rent-receive": [740, 0.14], "rent-pay": [190, 0.14], "jail-in": [110, 0.2], "jail-out": [520, 0.15],
      doubles: [820, 0.12], "card-draw": [460, 0.1], "property-buy": [620, 0.16], mortgage: [260, 0.12],
      "trade-success": [700, 0.18], "trade-declined": [150, 0.16], road: [330, 0.1], city: [620, 0.16],
      settlement: [480, 0.13], resources: [760, 0.12], "dev-card": [540, 0.1], seven: [170, 0.18],
      robber: [120, 0.18], "longest-road": [880, 0.22], "largest-army": [780, 0.22],
    };
    const [frequency, duration] = map[event];
    oscillator.frequency.value = frequency;
    oscillator.type = event === "money-loss" || event === "rent-pay" ? "sawtooth" : "sine";
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + duration);
  } catch { /* audio is optional */ }
}
