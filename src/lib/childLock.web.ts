/**
 * Child lock, browser side: full screen, and the browser asks before the page is closed or left.
 */
export function enterFullscreen(): void {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) void el.requestFullscreen().catch(() => {});
  } catch {
    /* not allowed here */
  }
}

export function exitFullscreen(): void {
  try {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  } catch {
    /* ignore */
  }
}

export function guardLeaving(): () => void {
  const ask = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = '';
  };
  window.addEventListener('beforeunload', ask);
  return () => window.removeEventListener('beforeunload', ask);
}
