let timerId: number | null = null;
let onTickCb: ((remaining: number) => void) | null = null;
let onExpireCb: (() => void) | null = null;

export function startTimer(
  seconds: number,
  onTick: (remaining: number) => void,
  onExpire: () => void
): void {
  stopTimer();
  onTickCb = onTick;
  onExpireCb = onExpire;

  const start = Date.now();
  const durationMs = seconds * 1000;

  const tick = () => {
    const elapsed = Date.now() - start;
    const remaining = Math.max(0, durationMs - elapsed);
    onTickCb?.(remaining);

    if (remaining <= 0) {
      stopTimer();
      onExpireCb?.();
    } else {
      timerId = requestAnimationFrame(tick);
    }
  };

  timerId = requestAnimationFrame(tick);
}

export function stopTimer(): void {
  if (timerId !== null) {
    cancelAnimationFrame(timerId);
    timerId = null;
  }
  onTickCb = null;
  onExpireCb = null;
}

export function getElapsedMs(startedAt: number): number {
  return Date.now() - startedAt;
}
