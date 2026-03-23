export const PAUSED_TIMER_SENTINEL_MAX_MS = Date.UTC(2000, 0, 1);

export function encodeFutureTimerTimestamp(seconds: number) {
  return new Date(Date.now() + Math.max(0, seconds) * 1000).toISOString();
}

export function encodePausedTimerTimestamp(seconds: number) {
  return new Date(Math.max(0, seconds) * 1000).toISOString();
}

export function decodeTimerSeconds(timerEndAt: string | null, timerActive: boolean): number {
  if (!timerEndAt) {
    return 0;
  }

  const target = new Date(timerEndAt).getTime();

  if (!Number.isFinite(target)) {
    return 0;
  }

  if (timerActive) {
    return Math.max(0, Math.round((target - Date.now()) / 1000));
  }

  if (target < PAUSED_TIMER_SENTINEL_MAX_MS) {
    return Math.round(target / 1000);
  }

  return Math.max(0, Math.round((target - Date.now()) / 1000));
}
