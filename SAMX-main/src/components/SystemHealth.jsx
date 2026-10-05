import { AlertOctagon, CheckCircle2, RadioTower, Waves, WifiOff } from 'lucide-react';

export default function SystemHealth({ connection, sensorOk, status, isStale }) {
  const issues = [];

  if (connection === 'OFFLINE') {
    issues.push({
      id: 'net-off',
      Icon: WifiOff,
      title: 'Network Error',
      desc: 'ขาดการเชื่อมต่อกับ ESP32 — ข้อมูลที่แสดงอาจไม่เป็นปัจจุบัน',
      cls: 'border-red-500/40 bg-red-500/10 text-red-300',
    });
  } else if (connection === 'RECONNECTING') {
    issues.push({
      id: 'net-recon',
      Icon: RadioTower,
      title: 'Reconnecting',
      desc: 'สัญญาณไม่เสถียร กำลังพยายามเชื่อมต่อใหม่',
      cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    });
  }

  if (!sensorOk) {
    issues.push({
      id: 'sensor',
      Icon: AlertOctagon,
      title: 'Sensor Offline',
      desc: 'Ultrasonic sensor ไม่ส่งค่ากลับ — ไม่ใช่สถานะน้ำวิกฤต แต่ต้องตรวจสอบอุปกรณ์',
      cls: 'border-red-500/40 bg-red-500/10 text-red-300',
    });
  }

  if (sensorOk && status.key === 'CRITICAL') {
    issues.push({
      id: 'water',
      Icon: Waves,
      title: 'Critical Water Level',
      desc: 'ระดับน้ำเกินขีดวิกฤต 15 cm — Buzzer ทำงาน และระบบ AUTO จะเปิดประตูระบาย',
      cls: 'border-red-500/40 bg-red-500/10 text-red-300',
    });
  }

  if (sensorOk && status.key === 'WARNING') {
    issues.push({
      id: 'water-warn',
      Icon: Waves,
      title: 'Water Level Warning',
      desc: 'ระดับน้ำเข้าสู่ช่วงเฝ้าระวัง 9–14 cm — เตรียมพร้อมรับสถานการณ์',
      cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    });
  }

  if (isStale && connection === 'ONLINE') {
    issues.push({
      id: 'stale',
      Icon: RadioTower,
      title: 'Stale Data',
      desc: 'ไม่ได้รับ telemetry ใหม่นานผิดปกติ',
      cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
    });
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur">
      <h3 className="mb-4 text-sm font-semibold text-slate-200">สถานะระบบ (System Health)</h3>

      {issues.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">ระบบทำงานปกติทุกส่วน</p>
            <p className="text-xs text-emerald-400/70">เซ็นเซอร์ เครือข่าย และระดับน้ำอยู่ในเกณฑ์ปลอดภัย</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {issues.map(({ id, Icon, title, desc, cls }) => (
            <div key={id} className={`flex items-start gap-3 rounded-xl border p-3.5 ${cls}`}>
              <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-xs opacity-80">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}