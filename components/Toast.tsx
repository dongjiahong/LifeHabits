import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'loading';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => string; // 返回 ID
  hideToast: (id: string) => void; // 新增关闭方法
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (type !== 'loading') {
      setTimeout(() => {
        hideToast(id);
      }, 3000);
    }
    return id;
  }, [hideToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {/* 调整 top 位置，从 top-12 改为 top-24，大幅下移避免遮挡 */}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-xs px-4 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center p-4 rounded-xl shadow-lg border backdrop-blur-md animate-fade-in-down transition-all ${
              toast.type === 'success' ? 'bg-white/90 border-green-200 text-green-800' :
              toast.type === 'error' ? 'bg-white/90 border-red-200 text-red-800' :
              toast.type === 'loading' ? 'bg-indigo-600/90 border-indigo-500 text-white' :
              'bg-white/90 border-slate-200 text-slate-800'
            }`}
          >
            <div className="mr-3 flex-shrink-0">
              {toast.type === 'success' && <CheckCircle size={20} />}
              {toast.type === 'error' && <AlertCircle size={20} />}
              {toast.type === 'info' && <Info size={20} />}
              {toast.type === 'loading' && <Loader2 size={20} className="animate-spin" />}
            </div>
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            {toast.type !== 'loading' && (
              <button onClick={() => hideToast(toast.id)} className="ml-2 opacity-50 hover:opacity-100">
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};