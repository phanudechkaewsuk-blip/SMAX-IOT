// ความสูงถังสำหรับ scale ภาพ (มี headroom เหนือ CRITICAL)
export const TANK_MAX_CM = 20;

export const THRESHOLD_WARNING = 9;   // >= 9  cm -> WARNING
export const THRESHOLD_CRITICAL = 15; // >= 15 cm -> CRITICAL

// เก็บ class เต็มสตริง เพราะ Tailwind ไม่ scan ชื่อคลาสที่ต่อสตริงแบบ dynamic
export const STATUS = {
  SAFE: {
    key: 'SAFE',
    label: 'ปลอดภัย',
    labelEn: 'SAFE',
    range: '0–8 cm',
    hex: '#10b981',
    text: 'text-emerald-400',
    bgSolid: 'bg-emerald-500',
    bgSoft: 'bg-emerald-500/10',
    border: 'border-emerald-500/40',
    dot: 'bg-emerald-400',
    buzzer: false,
  },
  WARNING: {
    key: 'WARNING',
    label: 'เฝ้าระวัง',
    labelEn: 'WARNING',
    range: '9–14 cm',
    hex: '#f59e0b',
    text: 'text-amber-400',
    bgSolid: 'bg-amber-500',
    bgSoft: 'bg-amber-500/10',
    border: 'border-amber-500/40',
    dot: 'bg-amber-400',
    buzzer: false,
  },
  CRITICAL: {
    key: 'CRITICAL',
    label: 'วิกฤต',
    labelEn: 'CRITICAL',
    range: '15–18 cm',
    hex: '#ef4444',
    text: 'text-red-400',
    bgSolid: 'bg-red-500',
    bgSoft: 'bg-red-500/10',
    border: 'border-red-500/40',
    dot: 'bg-red-400',
    buzzer: true,
  },
};

/** แปลงค่าเซ็นเซอร์ (cm) -> object สถานะ */
export function getStatusByLevel(cm) {
  if (cm >= THRESHOLD_CRITICAL) return STATUS.CRITICAL;
  if (cm >= THRESHOLD_WARNING) return STATUS.WARNING;
  return STATUS.SAFE;
}

export const ROLE = {
  USER: { key: 'USER', label: 'General User', canControl: false, canOverride: false },
  OPERATOR: { key: 'OPERATOR', label: 'Operator', canControl: true, canOverride: false },
  ADMIN: { key: 'ADMIN', label: 'Admin', canControl: true, canOverride: true },
};