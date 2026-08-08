import * as RadixToast from '@radix-ui/react-toast';
import { Cross2Icon } from '@radix-ui/react-icons';
import classNames from 'classnames';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './styles.module.scss';
import {
  showToast,
  subscribeToToasts,
  type ToastInput,
  type ToastVariant,
} from './store';

export { showToast, type ToastInput, type ToastVariant };

type ToastItem = ToastInput & { id: string; open: boolean; duration: number };

const ToastContext = createContext<((input: ToastInput) => void) | null>(null);

const TOAST_LIMIT = 3;
const REMOVE_DELAY_MS = 250;
const DURATION_BY_VARIANT: Record<ToastVariant, number> = {
  success: 5000,
  default: 7000,
  warning: 8000,
  error: 10000,
};

function resolveDuration(input: ToastInput): number {
  if (typeof input.duration === 'number' && Number.isFinite(input.duration)) {
    return Math.max(0, input.duration);
  }
  return DURATION_BY_VARIANT[input.variant ?? 'default'];
}

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return { show };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const dismissTimersRef = useRef<Map<string, number>>(new Map());
  const removeTimersRef = useRef<Map<string, number>>(new Map());

  const clearToastTimers = useCallback((id: string) => {
    const dismissTimer = dismissTimersRef.current.get(id);
    if (dismissTimer !== undefined) {
      window.clearTimeout(dismissTimer);
      dismissTimersRef.current.delete(id);
    }
    const removeTimer = removeTimersRef.current.get(id);
    if (removeTimer !== undefined) {
      window.clearTimeout(removeTimer);
      removeTimersRef.current.delete(id);
    }
  }, []);

  const remove = useCallback((id: string) => {
    clearToastTimers(id);
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, [clearToastTimers]);

  const dismiss = useCallback((id: string) => {
    clearToastTimers(id);
    setToasts((prev) => {
      const current = prev.find((toast) => toast.id === id);
      if (!current || !current.open) return prev;
      return prev.map((toast) => (toast.id === id ? { ...toast, open: false } : toast));
    });
    const removeTimer = window.setTimeout(() => remove(id), REMOVE_DELAY_MS);
    removeTimersRef.current.set(id, removeTimer);
  }, [clearToastTimers, remove]);

  const addToast = useCallback((input: ToastInput) => {
    const id = crypto.randomUUID();
    const duration = resolveDuration(input);

    setToasts((prev) => {
      const next = [{ ...input, id, open: true, duration }, ...prev];
      const sliced = next.slice(0, TOAST_LIMIT);
      const keptIds = new Set(sliced.map((toast) => toast.id));
      for (const toast of next) {
        if (!keptIds.has(toast.id)) {
          clearToastTimers(toast.id);
        }
      }
      return sliced;
    });

    const dismissTimer = window.setTimeout(() => dismiss(id), duration);
    dismissTimersRef.current.set(id, dismissTimer);
  }, [clearToastTimers, dismiss]);

  useEffect(() => subscribeToToasts(addToast), [addToast]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const dismissTimers = dismissTimersRef.current;
    const removeTimers = removeTimersRef.current;
    return () => {
      dismissTimers.forEach((timer) => window.clearTimeout(timer));
      removeTimers.forEach((timer) => window.clearTimeout(timer));
      dismissTimers.clear();
      removeTimers.clear();
    };
  }, []);

  const toastLayer = (
    <>
      {toasts.map((toast) => (
        <RadixToast.Root
          key={toast.id}
          className={classNames(styles.root, styles[toast.variant ?? 'default'])}
          open={toast.open}
          duration={Infinity}
          onOpenChange={(open) => {
            if (!open) {
              dismiss(toast.id);
            }
          }}
        >
          <RadixToast.Title className={styles.title}>{toast.title}</RadixToast.Title>
          {toast.description ? (
            <RadixToast.Description className={styles.description}>
              {toast.description}
            </RadixToast.Description>
          ) : null}
          {toast.action ? (
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                const run = toast.action?.onClick;
                dismiss(toast.id);
                run?.();
              }}
            >
              {toast.action.label}
            </button>
          ) : null}
          <RadixToast.Close className={styles.close} aria-label="Dismiss">
            <Cross2Icon />
          </RadixToast.Close>
        </RadixToast.Root>
      ))}
      <RadixToast.Viewport className={styles.viewport} />
    </>
  );

  return (
    <ToastContext.Provider value={addToast}>
      <RadixToast.Provider swipeDirection="right" duration={Infinity}>
        {children}
        {mounted ? createPortal(toastLayer, document.body) : null}
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
