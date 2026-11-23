import { CheckCircle2, Info, RotateCcw, X } from 'lucide-react';
import { ToastMessage } from '../types/portal';

interface ToastStackProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2.5rem)] no-print"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const toneRing =
          toast.tone === 'emerald'
            ? 'border-[#10B981]/45 bg-[#131C2E]/95'
            : toast.tone === 'volt'
              ? 'border-[#C3F400]/40 bg-[#131C2E]/95'
              : 'border-[#EF4444]/45 bg-[#1C141A]/95';

        const iconColor =
          toast.tone === 'emerald'
            ? 'text-[#4EDEA3]'
            : toast.tone === 'volt'
              ? 'text-[#C3F400]'
              : 'text-[#F87171]';

        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 backdrop-blur-md shadow-[0_16px_36px_-12px_rgba(0,0,0,0.8)] transition-all duration-150 ${toneRing}`}
          >
            {toast.tone === 'emerald' ? (
              <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
            ) : (
              <Info className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#DFE2EF] leading-snug">
                {toast.title}
              </p>
              {toast.detail && (
                <p className="mt-0.5 text-xs text-[#9AA7B8] leading-snug">
                  {toast.detail}
                </p>
              )}
              {toast.undoAction && (
                <button
                  type="button"
                  onClick={() => {
                    toast.undoAction?.();
                    onDismiss(toast.id);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[#C3F400] hover:text-white transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Undo
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="p-1 text-[#64748B] hover:text-[#DFE2EF] rounded transition-colors shrink-0"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
