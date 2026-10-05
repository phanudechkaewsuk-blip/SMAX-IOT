export const TANK_MAX_CM = 20;
export const THRESHOLD_WARNING_CM = 9;
export const THRESHOLD_CRITICAL_CM = 15;

export const WATER_STATUS = {
  SAFE: 'SAFE',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
  UNKNOWN: 'UNKNOWN',
};

/** level = null/undefined/NaN → UNKNOWN เสมอ ห้ามเดา */
export function getStatusByLevel(level) {
  if (level === null || level === undefined || Number.isNaN(Number(level))) {
    return WATER_STATUS.UNKNOWN;
  }
  const v = Number(level);
  if (v >= THRESHOLD_CRITICAL_CM) return WATER_STATUS.CRITICAL;
  if (v >= THRESHOLD_WARNING_CM) return WATER_STATUS.WARNING;
  return WATER_STATUS.SAFE;
}

export const CONNECTION = { ONLINE: 'ONLINE', RECONNECTING: 'RECONNECTING', OFFLINE: 'OFFLINE' };
export const GATE = { OPEN: 'OPEN', CLOSED: 'CLOSED', MOVING: 'MOVING', UNKNOWN: 'UNKNOWN' };