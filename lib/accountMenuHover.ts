export const ACCOUNT_MENU_CLOSE_DELAY_MS = 120;

export type AccountMenuCloseTimerRef = {
  current: ReturnType<typeof setTimeout> | null;
};

type ScheduleAccountMenuCloseOptions = {
  timerRef: AccountMenuCloseTimerRef;
  onClose: () => void;
  shouldRemainOpen: () => boolean;
  delay?: number;
  setTimer?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void;
};

export function cancelAccountMenuClose(
  timerRef: AccountMenuCloseTimerRef,
  clearTimer: (timer: ReturnType<typeof setTimeout>) => void = clearTimeout
) {
  if (timerRef.current === null) return;
  clearTimer(timerRef.current);
  timerRef.current = null;
}

export function scheduleAccountMenuClose({
  timerRef,
  onClose,
  shouldRemainOpen,
  delay = ACCOUNT_MENU_CLOSE_DELAY_MS,
  setTimer = setTimeout,
  clearTimer = clearTimeout
}: ScheduleAccountMenuCloseOptions) {
  cancelAccountMenuClose(timerRef, clearTimer);
  timerRef.current = setTimer(() => {
    timerRef.current = null;
    if (!shouldRemainOpen()) onClose();
  }, delay);
}
