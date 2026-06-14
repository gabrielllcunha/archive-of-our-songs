import * as RadixToast from '@radix-ui/react-toast';
import { Cross2Icon } from '@radix-ui/react-icons';
import classNames from 'classnames';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import styles from './styles.module.scss';
import {
  showToast,
  subscribeToToasts,
  type ToastInput,
  type ToastVariant,
} from './store';

export { showToast, type ToastInput, type ToastVariant };

type ToastItem = ToastInput & { id: string; open: boolean };

const ToastContext = createContext<((input: ToastInput) => void) | null>(null);

const TOAST_LIMIT = 3;
const DEFAULT_DURATION = 5000;
const REMOVE_DELAY_MS = 250;

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return { show };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((input: ToastInput) => {
    const id = crypto.randomUUID();
    setToasts((prev) => {
      const next = [{ ...input, id, open: true }, ...prev];
      return next.slice(0, TOAST_LIMIT);
    });
  }, []);

  useEffect(() => subscribeToToasts(addToast), [addToast]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((toast) => (toast.id === id ? { ...toast, open: false } : toast))
    );
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      <RadixToast.Provider swipeDirection="right" duration={DEFAULT_DURATION}>
        {children}
        {toasts.map((toast) => (
          <RadixToast.Root
            key={toast.id}
            className={classNames(styles.root, styles[toast.variant ?? 'default'])}
            open={toast.open}
            duration={toast.duration ?? DEFAULT_DURATION}
            onOpenChange={(open) => {
              if (!open) {
                dismiss(toast.id);
                window.setTimeout(() => remove(toast.id), REMOVE_DELAY_MS);
              }
            }}
          >
            <RadixToast.Title className={styles.title}>{toast.title}</RadixToast.Title>
            {toast.description ? (
              <RadixToast.Description className={styles.description}>
                {toast.description}
              </RadixToast.Description>
            ) : null}
            <RadixToast.Close className={styles.close} aria-label="Dismiss">
              <Cross2Icon />
            </RadixToast.Close>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className={styles.viewport} />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
