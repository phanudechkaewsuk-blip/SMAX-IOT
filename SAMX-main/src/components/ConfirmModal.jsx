import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'ยืนยัน',
  tone = 'danger',
  onConfirm,
  onCancel,
}) {
  // ปิด modal ด้วยปุ่ม Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const toneMap = {
    danger: { btn: 'bg-red-600 hover:bg-red-500', icon: 'text-red-400', soft: 'bg-red-500/10' },
    warn: { btn: 'bg-amber-600 hover:bg-amber-500', icon: 'text-amber-400', soft: 'bg-amber-500/10' },
  };
  const t = toneMap[tone] ?? toneMap.danger;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
      >
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
          aria-label="ปิด"
        >
          <X className="h-4 w-4" />
        </button>

        <div className={`mb-4 inline-flex rounded-xl ${t.soft} p-3`}>
          <AlertTriangle className={`h-6 w-6 ${t.icon}`} />
        </div>

        <h3 className="text-lg font-bold text-slate-100">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{message}</p>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-700"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${t.btn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}