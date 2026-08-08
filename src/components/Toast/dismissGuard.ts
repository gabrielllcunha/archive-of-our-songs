let ignoreDismissUntil = 0;

const GUARD_MS = 500;

export function markToastInteraction() {
  ignoreDismissUntil = Date.now() + GUARD_MS;
}

export function shouldIgnoreDialogDismiss() {
  return Date.now() < ignoreDismissUntil;
}
