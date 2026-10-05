import { useState } from 'react';
import {
  Activity, BellOff, BellRing, Droplets, Gauge, History,
  LayoutDashboard, Menu, Settings, ShieldCheck, Waves, Wifi, WifiOff, X,
} from 'lucide-react';

import useIoTData from './hooks/useIoTData';
import useBuzzer from './hooks/useBuzzer';
import { ROLE } from './constants/waterLevel';
import StatusCard from './components/StatusCard';
import WaterTank from './components/WaterTank';
import DamControlPanel from './components/DamControlPanel';
import SystemHealth from './components/SystemHealth';
import HistoryChart from './components/HistoryChart';

const NAV = [
  { key: 'dashboard', label: 'แดชบอร์ด', Icon: LayoutDashboard },
  { key: 'history', label: 'ประวัติย้อนหลัง', Icon: History },
  { key: 'devices', label: 'อุปกรณ์', Icon: Gauge },
  { key: 'settings', label: 'ตั้งค่า', Icon: Settings },
];

export default function App() {
  const iot = useIoTData();
  const [navOpen, setNavOpen] = useState(false);
  const [active, setActive] = useState('dashboard');
  const role = ROLE.OPERATOR;

  const buzzerOn = iot.status.buzzer && iot.sensorOk && iot.connection !== 'OFFLINE';
  useBuzzer(buzzerOn, iot.muted);

  const connMeta = {
    ONLINE: { label: 'เชื่อมต่อแล้ว', text: 'text-emerald-400', soft: 'bg-emerald-500/10', Icon: Wifi },
    RECONNECTING: { label: 'กำลังเชื่อมต่อ', text: 'text-amber-400', soft: 'bg-amber-500/10', Icon: Activity },
    OFFLINE: { label: 'ขาดการเชื่อมต่อ', text: 'text-red-400', soft: 'bg-red-500/10', Icon: WifiOff },
  }[iot.connection];

  const gateLabel = { OPEN: 'เปิด', CLOSED: 'ปิด', MOVING: 'กำลังทำงาน' }[iot.gate];

  return (
    <div className="flex min-h-screen bg-slate-950">
      <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-900/50 p-5 lg:block">
        <Brand />
        <nav className="mt-8 space-y-1">
          {NAV.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setActive(key)}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition
                ${active === key
                  ? 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>
        <RoleBadge role={role} />
      </aside>

      {navOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/80" onClick={() => setNavOpen(false)} />
          <aside className="relative h-full w-64 border-r border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <Brand />
              <button onClick={() => setNavOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-8 space-y-1">
              {NAV.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => { setActive(key); setNavOpen(false); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition
                    ${active === key ? 'bg-sky-500/15 text-sky-300' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </nav>
            <RoleBadge role={role} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-800 bg-slate-950/90 px-4 py-3 backdrop-blur sm:px-6">
          <button onClick={() => setNavOpen(true)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold text-slate-100 sm:text-lg">สถานีเฝ้าระวังน้ำ — จุดที่ 01</h1>
            <p className="truncate text-xs text-slate-500">
              อัปเดตล่าสุด {new Date(iot.lastUpdate).toLocaleTimeString('th-TH')}
            </p>
          </div>
          <span className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold sm:inline-flex ${connMeta.soft} ${connMeta.text}`}>
            <connMeta.Icon className="h-3.5 w-3.5" /> ESP32 {connMeta.label}
          </span>
          <button
            onClick={() => iot.setMuted((m) => !m)}
            className={`rounded-lg p-2 transition ${buzzerOn && !iot.muted ? 'bg-red-500/15 text-red-400' : 'text-slate-400 hover:bg-slate-800'}`}
            title={iot.muted ? 'เปิดเสียงเตือน' : 'ปิดเสียงเตือน'}
          >
            {iot.muted ? <BellOff className="h-5 w-5" /> : <BellRing className={`h-5 w-5 ${buzzerOn ? 'animate-pulse' : ''}`} />}
          </button>
        </header>

        {buzzerOn && (
          <div className="flex items-center gap-3 border-b border-red-500/40 bg-red-600/20 px-4 py-3 sm:px-6">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <p className="text-sm font-bold text-red-200">
              เตือนภัยระดับวิกฤต — น้ำอยู่ที่ {iot.level.toFixed(1)} cm | ประตูระบาย: {gateLabel}
            </p>
          </div>
        )}

        <main className="flex-1 space-y-4 p-4 sm:space-y-5 sm:p-6">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatusCard
              icon={Droplets} label="ระดับน้ำปัจจุบัน"
              value={iot.sensorOk ? iot.level.toFixed(1) : '--'} unit="cm"
              sub="เกณฑ์: ปลอดภัย 0–8 · เฝ้าระวัง 9–14 · วิกฤต 15–18"
              accentText={iot.status.text} accentSoft={iot.status.bgSoft} border={iot.status.border}
            />
            <StatusCard
              icon={Waves} label="สถานะน้ำ" value={iot.status.labelEn}
              sub={`${iot.status.label} · ช่วง ${iot.status.range}`}
              accentText={iot.status.text} accentSoft={iot.status.bgSoft}
              border={iot.status.border} pulsing={iot.status.key === 'CRITICAL'}
            />
            <StatusCard
              icon={ShieldCheck} label="ประตูระบายน้ำ" value={gateLabel}
              sub={`โหมดการทำงาน: ${iot.mode}`}
              accentText={iot.gate === 'OPEN' ? 'text-sky-400' : 'text-slate-300'}
              accentSoft={iot.gate === 'OPEN' ? 'bg-sky-500/10' : 'bg-slate-700/40'}
            />
            <StatusCard
              icon={connMeta.Icon} label="การเชื่อมต่อ ESP32" value={connMeta.label}
              sub={iot.sensorOk ? 'เซ็นเซอร์ทำงานปกติ' : 'เซ็นเซอร์ไม่ตอบสนอง'}
              accentText={connMeta.text} accentSoft={connMeta.soft}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-3 sm:gap-5">
            <div className="lg:col-span-1">
              <WaterTank level={iot.level} status={iot.status} sensorOk={iot.sensorOk} />
            </div>
            <div className="space-y-4 sm:space-y-5 lg:col-span-1">
              <DamControlPanel
                mode={iot.mode} gate={iot.gate} level={iot.level}
                canControl={role.canControl}
                onToggleMode={iot.toggleMode} onCommandGate={iot.commandGate}
              />
              <SystemHealth
                connection={iot.connection} sensorOk={iot.sensorOk}
                status={iot.status} isStale={iot.isStale}
              />
            </div>
            <div className="space-y-4 sm:space-y-5 lg:col-span-1">
              <HistoryChart data={iot.history} color={iot.status.hex} />
              <EventLog log={iot.log} />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="rounded-xl bg-sky-500/15 p-2">
        <Droplets className="h-5 w-5 text-sky-400" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-100">WaterGuard</p>
        <p className="text-[10px] uppercase tracking-wider text-slate-500">IoT Flood Control</p>
      </div>
    </div>
  );
}

function RoleBadge({ role }) {
  return (
    <div className="mt-8 rounded-xl border border-slate-800 bg-slate-950/50 p-3.5">
      <p className="text-[10px] uppercase tracking-wider text-slate-500">สิทธิ์การใช้งาน</p>
      <p className="mt-1 text-sm font-semibold text-sky-300">{role.label}</p>
      <p className="mt-1 text-xs text-slate-500">
        {role.canControl ? 'ควบคุมได้ภายในขอบเขตที่กำหนด' : 'ดูข้อมูลอย่างเดียว'}
      </p>
    </div>
  );
}

function EventLog({ log }) {
  const toneCls = { info: 'text-slate-400', warn: 'text-amber-400', error: 'text-red-400' };
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur">
      <h3 className="mb-4 text-sm font-semibold text-slate-200">บันทึกเหตุการณ์ล่าสุด</h3>
      {log.length === 0 ? (
        <p className="text-xs text-slate-600">ยังไม่มีเหตุการณ์</p>
      ) : (
        <ul className="max-h-56 space-y-2.5 overflow-y-auto pr-1">
          {log.map((e) => (
            <li key={e.id} className="flex gap-2.5 text-xs">
              <span className="shrink-0 tabular-nums text-slate-600">
                {e.at.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className={toneCls[e.tone]}>{e.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}