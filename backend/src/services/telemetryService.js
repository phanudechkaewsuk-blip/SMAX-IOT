import { query } from '../db/pool.js';
import { getStatusByLevel, WATER_STATUS, GATE } from '../constants/waterLevel.js';
import { getDevice, patchDevice, persistDeviceState, toPublicState } from './deviceRegistry.js';
import { logEvent, raiseAlert, resolveAlerts } from './eventService.js';
import { markAlive } from './statusManager.js';
import { emitDeviceState, emitReading } from '../ws/socket.js';

/**
 * payload ที่คาดหวังจาก ESP32:
 * { level_cm: 4.7, raw_distance_cm: 15.3, sensor_ok: true,
 *   gate: "CLOSED", mode: "AUTO", fw: "1.0.0", uptime_s: 1234 }
 * sensor_ok=false หรือ level_cm=-1 → เซ็นเซอร์พัง (แต่เครื่องยัง ONLINE)
 */
export async function handleTelemetry(code, payload) {
  const d = getDevice(code);
  if (!d) return;

  await markAlive(code, { firmware: payload.fw });

  const rawLevel = Number(payload.level_cm);
  const sensorOk = payload.sensor_ok !== false && Number.isFinite(rawLevel) && rawLevel >= 0;
  const level = sensorOk ? Number(rawLevel.toFixed(2)) : null;
  const status = sensorOk ? getStatusByLevel(level) : WATER_STATUS.UNKNOWN;

  const prevSensorOk = d.sensorOk;
  const prevStatus = d.status;

  patchDevice(code, {
    sensorOk,
    level,
    status,
    gate: Object.values(GATE).includes(payload.gate) ? payload.gate : d.gate,
    mode: payload.mode === 'MANUAL' ? 'MANUAL' : payload.mode === 'AUTO' ? 'AUTO' : d.mode,
    lastTelemetryAt: Date.now(),
  });

  // บันทึกลงฐานข้อมูล (level = NULL เมื่อเซ็นเซอร์พัง — ห้ามใส่ 0)
  await query(
    `INSERT INTO water_readings (device_id, level_cm, raw_distance_cm, status, sensor_ok, gate_state, mode)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [d.id, level, payload.raw_distance_cm ?? null, status, sensorOk, d.gate, d.mode]
  );

  // --- เซ็นเซอร์พัง / ฟื้น ---
  if (prevSensorOk && !sensorOk) {
    await logEvent({
      deviceId: d.id, deviceCode: code, type: 'SENSOR_FAIL', severity: 'ERROR',
      message: 'Ultrasonic sensor ไม่ตอบสนอง — ระดับน้ำไม่สามารถยืนยันได้',
      metadata: { raw: payload.raw_distance_cm ?? null },
    });
    await raiseAlert({
      deviceId: d.id, deviceCode: code, alertType: 'SENSOR_FAIL', severity: 'ERROR',
      message: 'เซ็นเซอร์วัดระดับน้ำขัดข้อง',
    });
  } else if (!prevSensorOk && sensorOk) {
    await logEvent({
      deviceId: d.id, deviceCode: code, type: 'SENSOR_RECOVERED', severity: 'INFO',
      message: `เซ็นเซอร์กลับมาทำงานปกติ — ${level} cm`,
    });
    await resolveAlerts(d.id, ['SENSOR_FAIL']);
  }

  // --- ข้ามเกณฑ์ระดับน้ำ ---
  if (sensorOk && status !== prevStatus) {
    if (status === WATER_STATUS.CRITICAL) {
      await raiseAlert({
        deviceId: d.id, deviceCode: code, alertType: 'LEVEL_CRITICAL', severity: 'CRITICAL',
        levelCm: level, message: `ระดับน้ำวิกฤต ${level} cm — ประตูระบายต้องเปิด`,
      });
    } else if (status === WATER_STATUS.WARNING) {
      await raiseAlert({
        deviceId: d.id, deviceCode: code, alertType: 'LEVEL_WARNING', severity: 'WARNING',
        levelCm: level, message: `ระดับน้ำเข้าเกณฑ์เฝ้าระวัง ${level} cm`,
      });
    } else {
      await resolveAlerts(d.id, ['LEVEL_CRITICAL', 'LEVEL_WARNING']);
    }
    await logEvent({
      deviceId: d.id, deviceCode: code, type: 'STATE_CHANGED', severity: 'INFO',
      message: `สถานะน้ำเปลี่ยน ${prevStatus} → ${status} (${level} cm)`,
    });
  }

  await persistDeviceState(code);

  const pub = toPublicState(getDevice(code));
  emitDeviceState(code, pub);
  emitReading(code, { level: pub.level, status: pub.status, sensorOk: pub.sensorOk, t: Date.now() });
}