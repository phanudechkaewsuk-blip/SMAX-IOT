import { useState } from 'react';
import { Cpu, DoorClosed, DoorOpen, Hand, Loader2, Lock } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function DamControlPanel({ mode, gate, level, canControl, onToggleMode, onCommandGate }) {
  const [pending, setPending] = useState(null); // 'OPEN' | 'CLOSED' | 'MODE' | null
  const isManual = mode === 'MANUAL';
  const isMoving = gate === 'MOVING';
  const locked = !canControl;

  const confirmText = {
    OPEN: {
      title: 'ยืนยันการเปิดประตูระบายน้ำ',
      message: `ระบบจะสั่ง Servo เปิดประตูระบายน้ำทันที ที่ระดับน้ำปัจจุบัน ${level.toFixed(1)} cm การกระทำนี้ส่งผลต่อพื้นที่ท้ายน้ำ กรุณาตรวจสอบก่อนยืนยัน`,
      label: 'เปิดประตู',
      tone: 'danger',
    },
    CLOSED: {
      title: 'ยืนยันการปิดประตูระบายน้ำ',
      message: `ระบบจะสั่ง Servo ปิดประตูระบายน้ำทันที หากระดับน้ำยังสูง อาจทำให้เกิดน้ำล้นได้ ระดับปัจจุบัน ${level.toFixed(1)} cm`,
      label: 'ปิดประตู',
      tone: 'danger',
    },
    MODE: {
      title: isManual ? 'กลับสู่โหมดอัตโนมัติ?' : 'เปลี่ยนเป็นโหมดควบคุมด้วยมือ?',
      message: isManual
        ? 'ระบบจะกลับไปตัดสินใจเปิด/ปิดประตูเองตามเกณฑ์ระดับน้ำที่ตั้งไว้'
        : 'ระบบอัตโนมัติจะหยุดทำงาน คุณต้องรับผิดชอบการเปิด/ปิดประตูด้วยตนเองทั้งหมด',
      label: 'ยืนยันเปลี่ยนโหมด',
      tone: 'warn',
    },
  };

  const handleConfirm = () => {
    if (pending === 'MODE') onToggleMode();
    else if (pending) onCommandGate(pending);
    setPending(null);
  };

  const gateBadge = {
    OPEN: { text: 'text-sky-400', bg: 'bg-sky-500/10', label: 'เปิดอยู่', Icon: DoorOpen },
    CLOSED: { text: 'text-slate-300', bg: 'bg-slate-700/40', label: 'ปิดอยู่', Icon: DoorClosed },
    MOVING: { text: 'text-amber-400', bg: 'bg-amber-500/10', label: 'กำลังทำงาน...', Icon: Loader2 },
  }[gate];

  return (
    <>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">แผงควบคุมประตูระบายน้ำ</h3>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${gateBadge.bg} ${gateBadge.text}`}>
            <gateBadge.Icon className={`h-3.5 w-3.5 ${isMoving ? 'animate-spin' : ''}`} />
            {gateBadge.label}
          </span>
        </div>

        {/* สลับโหมด AUTO / MANUAL */}
        <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950/50 p-1">
          <div className="grid grid-cols-2 gap-1">
            {['AUTO', 'MANUAL'].map((m) => {
              const active = mode === m;
              const Icon = m === 'AUTO' ? Cpu : Hand;
              return (
                <button
                  key={m}
                  disabled={locked || active}
                  onClick={() => setPending('MODE')}
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition
                    ${active
                      ? m === 'AUTO'
                        ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40'
                        : 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40'
                      : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'}
                    ${locked ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <Icon className="h-4 w-4" />
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        {/* ปุ่มสั่งงาน */}
        <div className="grid grid-cols-2 gap-3">
          <button
            disabled={!isManual || locked || isMoving || gate === 'OPEN'}
            onClick={() => setPending('OPEN')}
            className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600"
          >
            <DoorOpen className="h-4 w-4" /> เปิดประตู
          </button>
          <button
            disabled={!isManual || locked || isMoving || gate === 'CLOSED'}
            onClick={() => setPending('CLOSED')}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-700 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600"
          >
            <DoorClosed className="h-4 w-4" /> ปิดประตู
          </button>
        </div>

        {!isManual && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <Lock className="h-3.5 w-3.5" />
            ปุ่มควบคุมถูกล็อก — สลับเป็นโหมด MANUAL เพื่อสั่งงานด้วยตนเอง
          </p>
        )}
        {locked && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-red-400">
            <Lock className="h-3.5 w-3.5" />
            บัญชีของคุณไม่มีสิทธิ์ควบคุมอุปกรณ์
          </p>
        )}
      </div>

      <ConfirmModal
        open={pending !== null}
        title={pending ? confirmText[pending].title : ''}
        message={pending ? confirmText[pending].message : ''}
        confirmLabel={pending ? confirmText[pending].label : ''}
        tone={pending ? confirmText[pending].tone : 'danger'}
        onConfirm={handleConfirm}
        onCancel={() => setPending(null)}
      />
    </>
  );
}