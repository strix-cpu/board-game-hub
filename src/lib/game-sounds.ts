export type GameSoundEvent =
  | "dice-roll" | "money-gain" | "money-loss" | "rent-receive" | "rent-pay"
  | "jail-in" | "jail-out" | "doubles" | "card-draw" | "property-buy"
  | "mortgage" | "trade-success" | "trade-declined"
  | "road" | "city" | "settlement" | "resources" | "dev-card" | "seven"
  | "robber" | "longest-road" | "largest-army"
  | "victory" | "bankrupt" | "house-build" | "hotel-build";

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx || audioCtx.state === "closed") {
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new Ctx();
    } catch { return null; }
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", vol = 0.06) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playChord(freqs: number[], duration: number, type: OscillatorType = "sine", vol = 0.04) {
  freqs.forEach((f) => playTone(f, duration, type, vol));
}

function playNoise(duration: number, vol = 0.03) {
  const ctx = getCtx();
  if (!ctx) return;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 2000;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

function playSequence(notes: [number, number][], type: OscillatorType = "sine", vol = 0.05) {
  const ctx = getCtx();
  if (!ctx) return;
  let time = ctx.currentTime;
  notes.forEach(([freq, dur]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + dur);
    time += dur * 0.85;
  });
}

export function playGameSound(event: GameSoundEvent) {
  const ctx = getCtx();
  if (!ctx) return;

  switch (event) {
    // === MONOPOLY SOUNDS ===
    case "dice-roll":
      // Rattling dice with noise burst
      playNoise(0.12, 0.05);
      playTone(800, 0.04, "square", 0.02);
      setTimeout(() => playTone(600, 0.04, "square", 0.02), 50);
      setTimeout(() => playTone(900, 0.05, "square", 0.02), 100);
      break;

    case "doubles":
      // Exciting ascending chirp
      playSequence([[523, 0.08], [659, 0.08], [784, 0.12]], "triangle", 0.06);
      break;

    case "money-gain":
      // Cash register cha-ching
      playChord([1047, 1319, 1568], 0.25, "sine", 0.04);
      playTone(2093, 0.15, "sine", 0.03);
      break;

    case "money-loss":
      // Descending wah
      playSequence([[440, 0.1], [330, 0.12], [220, 0.18]], "sawtooth", 0.04);
      break;

    case "rent-receive":
      // Pleasant two-note notification
      playChord([659, 880], 0.2, "sine", 0.05);
      break;

    case "rent-pay":
      // Heavy thud
      playTone(120, 0.2, "sawtooth", 0.05);
      playNoise(0.08, 0.04);
      break;

    case "property-buy":
      // Satisfying ka-chunk
      playTone(200, 0.08, "square", 0.04);
      setTimeout(() => playChord([523, 659], 0.2, "sine", 0.05), 60);
      break;

    case "jail-in":
      // Ominous slam
      playTone(80, 0.3, "sawtooth", 0.06);
      playNoise(0.15, 0.05);
      setTimeout(() => playTone(60, 0.4, "sawtooth", 0.03), 100);
      break;

    case "jail-out":
      // Liberation fanfare
      playSequence([[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.15]], "triangle", 0.05);
      break;

    case "card-draw":
      // Quick card flip
      playNoise(0.06, 0.03);
      playTone(1200, 0.08, "sine", 0.03);
      break;

    case "mortgage":
      // Heavy stamp
      playTone(150, 0.15, "square", 0.04);
      playNoise(0.05, 0.04);
      break;

    case "trade-success":
      // Handshake - two harmonious notes
      playChord([523, 659, 784], 0.3, "sine", 0.05);
      setTimeout(() => playChord([659, 784, 988], 0.25, "sine", 0.04), 150);
      break;

    case "trade-declined":
      // Buzzer
      playTone(180, 0.25, "sawtooth", 0.05);
      playTone(185, 0.25, "sawtooth", 0.03);
      break;

    case "house-build":
      // Hammer tap
      playTone(800, 0.04, "square", 0.04);
      playNoise(0.03, 0.03);
      setTimeout(() => {
        playTone(1000, 0.04, "square", 0.04);
        playNoise(0.03, 0.03);
      }, 80);
      break;

    case "hotel-build":
      // Grand construction
      playSequence([[400, 0.06], [600, 0.06], [800, 0.06], [1000, 0.1]], "triangle", 0.05);
      playNoise(0.12, 0.03);
      break;

    case "bankrupt":
      // Dramatic descending collapse
      playSequence([[440, 0.12], [330, 0.12], [220, 0.15], [110, 0.3]], "sawtooth", 0.06);
      playNoise(0.2, 0.04);
      break;

    // === CATAN SOUNDS ===
    case "settlement":
      // Warm wooden thunk
      playTone(300, 0.1, "triangle", 0.05);
      playNoise(0.04, 0.03);
      break;

    case "city":
      // Grand upgrade sound
      playSequence([[300, 0.08], [450, 0.08], [600, 0.12]], "triangle", 0.05);
      break;

    case "road":
      // Quick placement tap
      playTone(500, 0.06, "triangle", 0.04);
      playTone(700, 0.06, "sine", 0.03);
      break;

    case "resources":
      // Resource collection chime
      playChord([523, 659], 0.2, "sine", 0.04);
      setTimeout(() => playTone(784, 0.15, "sine", 0.03), 100);
      break;

    case "dev-card":
      // Mysterious reveal
      playSequence([[330, 0.08], [440, 0.08], [550, 0.12], [660, 0.15]], "sine", 0.04);
      break;

    case "seven":
      // Dramatic alert
      playTone(200, 0.15, "sawtooth", 0.06);
      playTone(210, 0.15, "sawtooth", 0.04);
      setTimeout(() => playTone(300, 0.2, "sawtooth", 0.05), 120);
      break;

    case "robber":
      // Menacing rumble
      playTone(80, 0.25, "sawtooth", 0.05);
      playNoise(0.15, 0.04);
      setTimeout(() => playTone(100, 0.2, "sawtooth", 0.03), 80);
      break;

    case "longest-road":
      // Achievement fanfare
      playSequence([[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.2]], "triangle", 0.06);
      break;

    case "largest-army":
      // Military drumroll
      playSequence([[200, 0.04], [250, 0.04], [300, 0.04], [350, 0.04], [400, 0.08], [500, 0.12]], "square", 0.04);
      break;

    // === SHARED SOUNDS ===
    case "victory":
      // Triumphant fanfare
      playSequence([[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.2], [784, 0.08], [1047, 0.25]], "triangle", 0.06);
      setTimeout(() => playChord([523, 659, 784, 1047], 0.4, "sine", 0.03), 400);
      break;
  }
}

