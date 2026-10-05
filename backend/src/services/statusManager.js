import { env, ONLINE_WINDOW_MS, OFFLINE_WINDOW_MS } from '../config/env.js';
import { CONNECTION, GATE, WATER_STATUS } from '../constants/waterLevel.js';
import { listDevices, patchDevice, persistDeviceState, toPublicState, getDevice } from './deviceRegistry.js';
import { logEvent, raiseAlert, resolveAlerts } from './eventService.js';
import { emitDeviceState } from '../ws/socket.js';

let timer = null;

/** เรียกทุกครั้งที่ได้ยินเสียงจากอุปกรณ์ (heartbeat / telemetry / ack) */
export async function markAlive(code, { firmware } = {}) {
  const d = getDevice(code);
  if (!d) return;

  const now = new Date();
  const wasOffline = d.connection !== CONNECTION.ONLINE;

  patchDevice(code, {
    connection: CONNECTION.ONLINE,
    lastSeenAt: now.toISOString(),
    lastHeartbeatAt: now.getTime(),
    missedHeartbeats: 0,
    ...(firmware ? { firmware } : {}),
  });

  if (wasOffline) {
    await logEvent({
      deviceId: d.id, deviceCode: code, type: 'DEVICE_ONLINE', severity: 'INFO',
      message: `${code} กลับมาเชื่อมต่อแล้ว`,
    });
    await resolveAlerts(d.id, ['DEVICE_OFFLINE']);
    await persistDeviceState(code);
    broadcast(code);
  }
}

/** LWT หรือ heartbeat ขาดครบ 3 รอบ */
export async function markOffline(code, reason) {
  const d = getDevice(code);
  if (!d || d.connection === CONNECTION.OFFLINE) return;

  patchDevice(code, {
    connection: CONNECTION.OFFLINE,
    sensorOk: false,
    level: null,                       // ★ ห้ามค้างค่าเก่า
    status: WATER_STATUS.UNKNOWN,      // ★ ห้ามเดาสถานะ
    gate: GATE.UNKNOWN,                // ★ ไม่รู้ว่าประตูอยู่ท่าไหน
  });

  await logEvent({
    deviceId: d.id, deviceCode: code, type: reason === 'LWT' ? 'LWT_RECEIVED' : 'DEVICE_OFFLINE',
    severity: 'ERROR',
    message: reason === 'LWT'
      ? `${code} ตัดการเชื่อมต่อ (MQTT Last Will)`
      : `${code} ขาด heartbeat ${env.heartbeat.missLimit} รอบติดต่อกัน`,
    metadata: { reason },
  });
  await raiseAlert({
    deviceId: d.id, deviceCode: code, alertType: 'DEVICE_OFFLINE', severity: 'ERROR',
    message: `ขาดการเชื่อมต่อกับ ${code} — ข้อมูลที่แสดงไม่สามารถยืนยันได้`,
  });

  await persistDeviceState(code);
  broadcast(code);
}

function broadcast(code) {
  const d = getDevice(code);
  if (d) emitDeviceState(code, toPublicState(d));
}

/** สแกนทุก 5 วินาที: ONLINE → RECONNECTING → OFFLINE */
export function startStatusManager() {
  if (timer) clearInterval(timer);

  timer = setInterval(async () => {
    const now = Date.now();

    for (const d of listDevices()) {
      const last = d.lastHeartbeatAt ?? 0;
      const silence = now - last;

      if (d.connection === CONNECTION.OFFLINE) continue;
      if (!d.lastHeartbeatAt) { await markOffline(d.deviceCode, 'NO_HEARTBEAT_EVER'); continue; }

      if (silence >= OFFLINE_WINDOW_MS) {
        await markOffline(d.deviceCode, 'HEARTBEAT_TIMEOUT');
      } else if (silence >= ONLINE_WINDOW_MS && d.connection !== CONNECTION.RECONNECTING) {
        const missed = Math.floor(silence / env.heartbeat.intervalMs);
        patchDevice(d.deviceCode, { connection: CONNECTION.RECONNECTING, missedHeartbeats: missed });
        await logEvent({
          deviceId: d.id, deviceCode: d.deviceCode, type: 'STATE_CHANGED', severity: 'WARNING',
          message: `สัญญาณไม่เสถียร — ขาด heartbeat ${missed} รอบ`,
          metadata: { silenceMs: silence },
        });
        broadcast(d.deviceCode);
      }
    }
  }, env.heartbeat.scanMs);

  console.log(`[status] manager started — online<${ONLINE_WINDOW_MS}ms, offline>=${OFFLINE_WINDOW_MS}ms`);
}

export function stopStatusManager() {
  if (timer) clearInterval(timer);
  timer = null;
}