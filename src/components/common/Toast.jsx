import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Toast() {
  const { toast, clearToast } = useAuth();

  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-crimson-600 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
  };

  const borders = {
    success: 'border-emerald-200 bg-emerald-50/90 text-emerald-950',
    error: 'border-crimson-200 bg-crimson-50/95 text-crimson-950',
    info: 'border-blue-200 bg-blue-50/90 text-blue-950'
  };

  return (
    <div className="fixed top-5 right-5 z-50 animate-bounce-short max-w-md w-full no-print">
      <div className={`flex items-center gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 ${borders[toast.type] || borders.success}`}>
        {icons[toast.type] || icons.success}
        <div className="flex-1 text-sm font-medium">
          {toast.message}
        </div>
        <button
          onClick={clearToast}
          className="text-gray-400 hover:text-gray-700 transition-colors p-1"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
