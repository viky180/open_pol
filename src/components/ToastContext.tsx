'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';

type ToastTone = 'success' | 'error' | 'info';

type ToastItem = {
    id: number;
    tone: ToastTone;
    text: string;
};

type ToastOptions = {
    durationMs?: number;
};

type ToastContextType = {
    showToast: (tone: ToastTone, text: string, options?: ToastOptions) => void;
    dismissToast: (id: number) => void;
};

const MAX_TOASTS = 4;
const DEFAULT_DURATION_MS = 3600;

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

    const dismissToast = useCallback((id: number) => {
        const timeout = timeoutsRef.current.get(id);
        if (timeout) {
            clearTimeout(timeout);
            timeoutsRef.current.delete(id);
        }
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback((tone: ToastTone, text: string, options?: ToastOptions) => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        const durationMs = options?.durationMs ?? DEFAULT_DURATION_MS;

        setToasts((prev) => {
            const next = [...prev, { id, tone, text }];
            if (next.length > MAX_TOASTS) {
                const droppedToast = next.shift();
                if (droppedToast) {
                    const droppedTimeout = timeoutsRef.current.get(droppedToast.id);
                    if (droppedTimeout) {
                        clearTimeout(droppedTimeout);
                        timeoutsRef.current.delete(droppedToast.id);
                    }
                }
            }
            return next;
        });

        const timeout = setTimeout(() => {
            dismissToast(id);
        }, durationMs);
        timeoutsRef.current.set(id, timeout);
    }, [dismissToast]);

    useEffect(() => {
        const timeoutMap = timeoutsRef.current;
        return () => {
            timeoutMap.forEach((timeout) => clearTimeout(timeout));
            timeoutMap.clear();
        };
    }, []);

    const value = useMemo<ToastContextType>(() => ({
        showToast,
        dismissToast,
    }), [dismissToast, showToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}

            <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[140] px-4 sm:bottom-6">
                <div className="mx-auto flex w-full max-w-md flex-col gap-2">
                    {toasts.map((toast) => (
                        <div
                            key={toast.id}
                            role="status"
                            aria-live="polite"
                            className={`pointer-events-auto flex items-start justify-between gap-3 rounded-2xl border px-3 py-3 text-sm shadow-lg animate-slide-up ${
                                toast.tone === 'error'
                                    ? 'border-warning/20 bg-warning/10 text-warning'
                                    : toast.tone === 'success'
                                        ? 'border-success/20 bg-success/10 text-success'
                                        : 'border-border-primary bg-bg-card text-text-secondary'
                            }`}
                        >
                            <p className="leading-5">{toast.text}</p>
                            <button
                                type="button"
                                onClick={() => dismissToast(toast.id)}
                                className="shrink-0 rounded-md px-1.5 py-0.5 text-xs text-current/80 hover:text-current"
                                aria-label="Dismiss notification"
                            >
                                x
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
