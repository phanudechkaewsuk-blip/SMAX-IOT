import { TANK_MAX_CM, THRESHOLD_CRITICAL, THRESHOLD_WARNING } from '../constants/waterLevel';

export default function WaterTank({ level, status, sensorOk }) {
  const pct = Math.min(100, Math.max(0, (level / TANK_MAX_CM) * 100));
  const warnPct = (THRESHOLD_WARNING / TANK_MAX_CM) * 100;
  const critPct = (THRESHOLD_CRITICAL / TANK_MAX_CM) * 100;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">ระดับน้ำปัจจุบัน</h3>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.bgSoft} ${status.text}`}>
          {status.labelEn} · {status.range}
        </span>
      </div>

      <div className="flex items-stretch gap-4">
        {/* แกนสเกล cm */}
        <div className="relative w-9 shrink-0 text-[10px] text-slate-500">
          {[20, 15, 10, 5, 0].map((tick) => (
            <div
              key={tick}
              className="absolute right-0 -translate-y-1/2"
              style={{ bottom: `${(tick / TANK_MAX_CM) * 100}%` }}
            >
              {tick} cm
            </div>
          ))}
        </div>

        {/* ตัวถัง */}
        <div className="relative h-64 flex-1 overflow-hidden rounded-xl border-2 border-slate-700 bg-slate-950/80">
          {/* เส้นขีดอันตราย */}
          <div
            className="absolute left-0 right-0 border-t border-dashed border-amber-500/60"
            style={{ bottom: `${warnPct}%` }}
          >
            <span className="absolute right-1 -top-4 text-[10px] font-medium text-amber-400">
              WARNING 9cm
            </span>
          </div>
          <div
            className="absolute left-0 right-0 border-t border-dashed border-red-500/70"
            style={{ bottom: `${critPct}%` }}
          >
            <span className="absolute right-1 -top-4 text-[10px] font-medium text-red-400">
              CRITICAL 15cm
            </span>
          </div>

          {/* มวลน้ำ */}
          <div
            className={`absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out ${status.bgSolid} opacity-80`}
            style={{ height: `${pct}%` }}
          >
            <div className="absolute -top-2 left-0 h-4 w-[200%] animate-wave opacity-60">
              <svg viewBox="0 0 120 12" preserveAspectRatio="none" className="h-full w-full">
                <path
                  d="M0 6 Q 15 0 30 6 T 60 6 T 90 6 T 120 6 V12 H0 Z"
                  fill={status.hex}
                />
              </svg>
            </div>
          </div>

          {/* ตัวเลขกลางถัง */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-white drop-shadow-lg">
              {sensorOk ? level.toFixed(1) : '--'}
            </span>
            <span className="text-xs font-medium text-white/70">เซนติเมตร</span>
          </div>

          {!sensorOk && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
              <span className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-300">
                SENSOR OFFLINE
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}