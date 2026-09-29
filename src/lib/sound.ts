"use client";
// Sounds are generated in the browser, so no audio files are needed.
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as any).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** Browsers only allow sound after the first tap or key press, so unlock audio then. */
export function primeAudio() {
  const unlock = () => { audio(); window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

function tone(c: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.18) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(c.destination);
  o.start(start);
  o.stop(start + dur + 0.05);
  return o;
}

/** A gentle bell alarm. Returns its length in milliseconds. */
export function playChime(): number {
  const c = audio();
  if (!c) return 0;
  const t = c.currentTime + 0.05;
  for (const off of [0, 0.9]) {
    tone(c, 880, t + off, 0.6);
    tone(c, 1318.5, t + off + 0.18, 0.7);
    tone(c, 1760, t + off + 0.36, 0.9, "sine", 0.12);
  }
  return 2000;
}

/** The traditional "Happy Birthday" melody (public domain, 1893). */
export function playSerenade(): { stop: () => void; duration: number } {
  const c = audio();
  if (!c) return { stop: () => {}, duration: 0 };
  const N: Record<string, number> = { G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99 };
  const song: [string, number][] = [
    ["G4", 0.75], ["G4", 0.25], ["A4", 1], ["G4", 1], ["C5", 1], ["B4", 2],
    ["G4", 0.75], ["G4", 0.25], ["A4", 1], ["G4", 1], ["D5", 1], ["C5", 2],
    ["G4", 0.75], ["G4", 0.25], ["G5", 1], ["E5", 1], ["C5", 1], ["B4", 1], ["A4", 2],
    ["F5", 0.75], ["F5", 0.25], ["E5", 1], ["C5", 1], ["D5", 1], ["C5", 3],
  ];
  const beat = 0.42;
  let t = c.currentTime + 0.1;
  const oscs: OscillatorNode[] = [];
  for (const [n, len] of song) {
    const d = len * beat;
    oscs.push(tone(c, N[n], t, d * 0.95, "triangle", 0.2));
    oscs.push(tone(c, N[n] / 2, t, d * 0.95, "sine", 0.07));
    t += d;
  }
  const duration = Math.round((t - c.currentTime) * 1000);
  return { stop: () => oscs.forEach((o) => { try { o.stop(); } catch {} }), duration };
}
