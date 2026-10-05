import { query } from '../db/pool.js';
import { CONNECTION, GATE, WATER_STATUS } from '../constants/waterLevel.js';

/** Map<deviceCode, state> */
const registry = new Map();

function blankState(row) {
  return {
    id: row.id,
    deviceCode: row.device_code,
    name: row.name,
    location: row.location,
    thresholds: {
      warning: Number(row.threshold_warning_cm),
      critical: Number(row.threshold_critical_cm),
      tankMax: Number(row.tank_height_cm),
    },
    connection: CONNECTION.OFFLINE,
    sensorOk: false,
    level: null,
    status: WATER_STATUS.UNKNOWN,
    mode: row.mode,
    gate: GATE.UNKNOWN,
    firmware: row.firmware_version ?? null,
    lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at).toISOString() : null,
    lastHeartbeatAt: null,
    lastTelemetryAt: null,
    missedHeartbeats: 0,
  };
}

export async function loadDevices() {
  const { rows } = await query('SELECT * FROM devices WHERE is_active = TRUE');
  registry.clear();
  for (const row of rows) registry.set(row.device_code, blankState(row));
  console.log(`[registry] loaded ${rows.length} device(s) — all start as OFFLINE`);
}

export const getDevice = (code) => registry.get(code) ?? null;
export const listDevices = () => [...registry.values()];
export const hasDevice = (code) => registry.has(code);

export function patchDevice(code, patch) {
  const d = registry.get(code);
  if (!d) return null;
  Object.assign(d, patch);
  return d;
}

/**
 * สิ่งเดียวที่ frontend ควรเชื่อ
 * กติกา: OFFLINE → ไม่มี level, ไม่มี status, ไม่มี gate, สั่งงานไม่ได้
 */
export function toPublicState(d) {
  const offline = d.connection === CONNECTION.OFFLINE;
  const dataValid = !offline && d.sensorOk && d.level !== null;

  return {
    deviceCode: d.deviceCode,
    name: d.name,
    location: d.location,
    connection: d.connection,
    sensorOk: offline ? false : d.sensorOk,
    level: dataValid ? d.level : null,
    status: dataValid ? d.status : WATER_STATUS.UNKNOWN,
    mode: offline ? null : d.mode,
    gate: offline ? GATE.UNKNOWN : d.gate,
    thresholds: d.thresholds,
    lastSeenAt: d.lastSeenAt,
    dataValid,
    canControl: !offline && d.mode === 'MANUAL' && d.gate !== GATE.MOVING,
    reason: offline
      ? 'DEVICE_OFFLINE'
      : !d.sensorOk
        ? 'SENSOR_ERROR'
        : d.mode === 'AUTO'
          ? 'AUTO_MODE_LOCKED'
          : null,
  };
}

export async function persistDeviceState(code) {
  const d = registry.get(code);
  if (!d) return;
  await query(
    `UPDATE devices SET connection_state=$1, sensor_ok=$2, last_level_cm=$3,
            last_status=$4, mode=$5, gate_state=$6, last_seen_at=$7, firmware_version=$8
     WHERE device_code=$9`,
    [d.connection, d.sensorOk, d.level, d.status, d.mode, d.gate, d.lastSeenAt, d.firmware, code]
  );
}