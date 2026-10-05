import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TANK_MAX_CM, THRESHOLD_CRITICAL, THRESHOLD_WARNING } from '../constants/waterLevel';

export default function HistoryChart({ data, color }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur">
      <h3 className="mb-4 text-sm font-semibold text-slate-200">ประวัติระดับน้ำ (Real-time)</h3>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 8, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="waterFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.5} />
                <stop offset="100%" stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="t" tick={{ fill: '#64748b', fontSize: 10 }} minTickGap={40} />
            <YAxis domain={[0, TANK_MAX_CM]} tick={{ fill: '#64748b', fontSize: 10 }} />
            <Tooltip
              contentStyle={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 12,
                fontSize: 12,
              }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(v) => [`${v} cm`, 'ระดับน้ำ']}
            />
            <ReferenceLine y={THRESHOLD_WARNING} stroke="#f59e0b" strokeDasharray="4 4" />
            <ReferenceLine y={THRESHOLD_CRITICAL} stroke="#ef4444" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="level"
              stroke={color}
              strokeWidth={2}
              fill="url(#waterFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}