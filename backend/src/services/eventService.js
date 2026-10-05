import { query } from '../db/pool.js';
import { emitEvent, emitAlert } from '../ws/socket.js';

export async function logEvent({ deviceId, deviceCode, type, severity = 'INFO', message, metadata = null }) {
  const { rows } = await query(
    `INSERT INTO system_events (device_id, event_type, severity, message, metadata)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at`,
    [deviceId ?? null, type, severity, message, metadata]
  );
  const payload = {
    id: rows[0].id, deviceCode, type, severity, message, metadata,
    createdAt: rows[0].created_at,
  };
  emitEvent(deviceCode, payload);
  console.log(`[event] ${severity} ${type} — ${message}`);
  return payload;
}

export async function raiseAlert({ deviceId, deviceCode, alertType, severity, levelCm = null, message }) {
  // กันสร้างซ้ำ: ถ้ามี alert ชนิดเดียวกันที่ยังไม่ปิด ให้ข้าม
  const dup = await query(
    `SELECT id FROM alerts WHERE device_id=$1 AND alert_type=$2 AND resolved_at IS NULL LIMIT 1`,
    [deviceId, alertType]
  );
  if (dup.rowCount > 0) return null;

  const { rows } = await query(
    `INSERT INTO alerts (device_id, alert_type, severity, level_cm, message)
     VALUES ($1,$2,$3,$4,$5) RETURNING id, created_at`,
    [deviceId, alertType, severity, levelCm, message]
  );
  const payload = { id: rows[0].id, deviceCode, alertType, severity, levelCm, message, createdAt: rows[0].created_at };
  emitAlert(deviceCode, payload);
  return payload;
}

export async function resolveAlerts(deviceId, alertTypes) {
  await query(
    `UPDATE alerts SET resolved_at = NOW()
     WHERE device_id=$1 AND alert_type = ANY($2) AND resolved_at IS NULL`,
    [deviceId, alertTypes]
  );
}