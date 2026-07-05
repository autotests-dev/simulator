import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type Toast = { id: number; message: string };
type ToastValue = { toast: (message: string) => void };

const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((message: string) => {
    idRef.current += 1;
    const id = idRef.current;
    setToasts((current) => [...current, { id, message }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 2500);
  }, []);

  const value = useMemo<ToastValue>(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            data-testid="toast"
            className="pointer-events-auto rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
