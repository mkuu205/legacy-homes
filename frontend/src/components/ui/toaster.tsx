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

  const colors = {
    success: 'border-green-500 bg-green-500 dark:bg-green-600 dark:border-green-500',
    error: 'border-red-500 bg-red-500 dark:bg-red-600 dark:border-red-500',
    info: 'border-blue-500 bg-blue-500 dark:bg-blue-600 dark:border-blue-500',
    warning: 'border-orange-500 bg-orange-500 dark:bg-orange-600 dark:border-orange-500',
  };

  const textColors = {
    success: 'text-white',
    error: 'text-white',
    info: 'text-white',
    warning: 'text-white',
  };

  const iconColors = {
    success: 'text-white',
    error: 'text-white',
    info: 'text-white',
    warning: 'text-white',
  };

  const icons = {
    success: <CheckCircle className={`w-5 h-5 ${iconColors.success}`} />,
    error: <AlertCircle className={`w-5 h-5 ${iconColors.error}`} />,
    info: <Info className={`w-5 h-5 ${iconColors.info}`} />,
    warning: <AlertTriangle className={`w-5 h-5 ${iconColors.warning}`} />,
  };

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg ${colors[t.type]} animate-in slide-in-from-top duration-300 pointer-events-auto`}
          >
            <div className="flex-shrink-0 mt-0.5">{icons[t.type]}</div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${textColors[t.type]}`}>{t.title}</p>
              {t.description && (
                <p className={`text-xs mt-1 ${textColors[t.type]} opacity-90`}>{t.description}</p>
              )}
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              className="flex-shrink-0 opacity-80 hover:opacity-100 transition-opacity text-white"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
