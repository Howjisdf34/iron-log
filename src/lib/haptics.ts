export type HapticPattern = "tap" | "setComplete" | "pr" | "restEnd";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 10,
  setComplete: [20, 30, 20],
  pr: [15, 40, 15, 40, 30],
  restEnd: [40, 60, 40],
};

export function triggerHaptic(pattern: HapticPattern, enabled = true): void {
  if (!enabled) return;
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  navigator.vibrate(PATTERNS[pattern]);
}
