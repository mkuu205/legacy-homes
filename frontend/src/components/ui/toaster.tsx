'use client';

import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextType {
  toast: (options: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback for outside provider
    return {
      toast: (options: Omit<Toast, 'id'>) => {
        console.log('Toast:', options);
      },
    };
  }
  return ctx;
}

// Global toast function
let globalToast: ((options: Omit<Toast, 'id'>) => void) | null = null;

export function toast(options: Omit<Toast, 'id'>) {
  if (globalToast) globalToast(options);
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((options: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { ...options, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    globalToast = addToast;
    return () => { globalToast = null; };
  }, [addToast]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
  };

  const colors = {
    success: 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800',
    error: 'border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800',
    info: 'border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800',
    warning: 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800',
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg ${colors[t.type]} animate-in slide-in-from-top duration-300`}
          >
            <div className="flex-shrink-0 mt-0.5">{icons[t.type]}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{t.title}</p>
              {t.description && (
                <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>{t.description}</p>
              )}
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
