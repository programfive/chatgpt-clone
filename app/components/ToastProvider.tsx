'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning';

export type ToastInput = {
  variant: ToastVariant;
  title?: string;
  message: string;
  durationMs?: number;
};

type ToastItem = ToastInput & {
  id: string;
  createdAt: number;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function variantStyles(variant: ToastVariant) {
  switch (variant) {
    case 'success':
      return {
        container: 'border-emerald-500/30 bg-[#101010] text-white',
        icon: <CheckCircle2 size={18} className="text-emerald-400" />,
        badge: 'text-emerald-300',
      };
    case 'warning':
      return {
        container: 'border-amber-500/30 bg-[#101010] text-white',
        icon: <AlertTriangle size={18} className="text-amber-400" />,
        badge: 'text-amber-300',
      };
    case 'error':
    default:
      return {
        container: 'border-rose-500/30 bg-[#101010] text-white',
        icon: <XCircle size={18} className="text-rose-400" />,
        badge: 'text-rose-300',
      };
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const durationMs = toast.durationMs ?? 2500;

      const item: ToastItem = {
        ...toast,
        id,
        createdAt: Date.now(),
      };

      setToasts((prev) => [item, ...prev].slice(0, 5));

      window.setTimeout(() => {
        dismissToast(id);
      }, durationMs);
    },
    [dismissToast]
  );

  const value = useMemo<ToastContextValue>(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3">
        {toasts.map((t) => {
          const styles = variantStyles(t.variant);
          return (
            <div
              key={t.id}
              className={`rounded-2xl border px-4 py-3 shadow-xl backdrop-blur ${styles.container}`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{styles.icon}</div>
                <div className="flex-1">
                  {t.title ? (
                    <div className={`text-sm font-semibold ${styles.badge}`}>{t.title}</div>
                  ) : null}
                  <div className="text-sm text-white/90">{t.message}</div>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(t.id)}
                  className="rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                  aria-label="Cerrar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return ctx;
}
