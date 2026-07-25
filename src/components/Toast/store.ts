export type ToastVariant = 'default' | 'success' | 'warning' | 'error';

export type ToastAction = {
  label: string;
  onClick: () => void;
};

export type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: ToastAction;
};

type ToastListener = (toast: ToastInput) => void;

const listeners = new Set<ToastListener>();

export function showToast(input: ToastInput) {
  listeners.forEach((listener) => listener(input));
}

export function subscribeToToasts(listener: ToastListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
