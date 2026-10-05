export default function StatusCard({
  icon: Icon,
  label,
  value,
  unit,
  sub,
  accentText = 'text-sky-400',
  accentSoft = 'bg-sky-500/10',
  border = 'border-slate-800',
  pulsing = false,
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${border} bg-slate-900/60 p-4 shadow-lg backdrop-blur transition-colors sm:p-5`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className={`text-3xl font-bold leading-none ${accentText} sm:text-4xl`}>
              {value}
            </span>
            {unit && <span className="text-sm font-medium text-slate-400">{unit}</span>}
          </div>
          {sub && <p className="mt-2 truncate text-xs text-slate-500">{sub}</p>}
        </div>
        <div className={`relative shrink-0 rounded-xl ${accentSoft} p-2.5`}>
          {pulsing && (
            <span className={`absolute inset-0 rounded-xl ${accentSoft} animate-pulseRing`} />
          )}
          <Icon className={`relative h-5 w-5 ${accentText}`} />
        </div>
      </div>
    </div>
  );
}