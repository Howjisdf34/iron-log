/**
 * Beeps cortos sintetizados con WebAudio — nada de assets de audio de
 * terceros (CLAUDE.md prohíbe SDKs/recursos externos en runtime).
 */

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  durationSec: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + durationSec);
  osc.connect(gain).connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + durationSec);
}

export function playRestEndSound(enabled = true): void {
  if (!enabled) return;
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  playTone(ctx, 880, now, 0.12);
  playTone(ctx, 1175, now + 0.14, 0.16);
}

export function playSetCompleteSound(enabled = true): void {
  if (!enabled) return;
  const ctx = getContext();
  if (!ctx) return;
  playTone(ctx, 660, ctx.currentTime, 0.08);
}
