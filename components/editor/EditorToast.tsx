'use client';

import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export interface ToastData {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface EditorToastProps {
  toast: ToastData;
  onDismiss: () => void;
}

export default function EditorToast({ toast, onDismiss }: EditorToastProps) {
  return (
    <div
      className={`fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 ${
        toast.type === 'success' ? 'bg-indigo-600 text-white' :
        toast.type === 'error' ? 'bg-red-600 text-white' :
        'bg-zinc-800 text-white border border-zinc-700'
      }`}
    >
      {toast.type === 'success' && <CheckCircle size={20} />}
      {toast.type === 'error' && <XCircle size={20} />}
      {toast.type === 'info' && <AlertCircle size={20} />}
      <span className="font-medium text-sm">{toast.message}</span>
      <button onClick={onDismiss} className="ml-2 hover:opacity-70">
        <X size={16} />
      </button>
    </div>
  );
}
