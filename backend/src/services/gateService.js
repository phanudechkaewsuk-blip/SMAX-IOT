import { randomUUID } from 'node:crypto';
import { query } from '../db/pool.js';
import { env } from '../config/env.js';
import { CONNECTION, GATE } from '../constants/waterLevel.js';
import { getDevice, patchDevice, persistDeviceState, toPublicState } from './deviceRegistry.js';
import { publish } from '../mqtt/client.js';
import { pubTopic } from '../mqtt/topics.js';
import { logEvent } from './eventService.js';
import { emitDeviceState, emitGateResult } from '../ws/socket.js';

/** commandId → { timer, code, action, startedAt } */
const pending = new Map();

export class GateError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

export async function requestGate({ deviceCode, action, user = null }) {
  const d = getDevice(deviceCode);
  if (!d) throw new GateError('DEVICE_NOT_FOUND', 'ไม่พบอุปกรณ์');

  // ★ กติกาความปลอดภัย — ปฏิเสธที่ backend ไม่ใช่แค่ disable ปุ่มที่ frontend
  if (d.connection === CONNECTION.OFFLINE)
    throw new GateError('DEVICE_OFFLINE', 'อุปกรณ์ไม่ได้เชื่อมต่อ — สั่งงานไม่ได้');
  if (d.mode !== 'MANUAL')
    throw new GateError('AUTO_MODE_LOCKED', 'ระบบอยู่ในโหมด AUTO — สลับเป็น MANUAL ก่อน');
  if (d.gate === GATE.MOVING)
    throw new GateError('GATE_BUSY', 'ประตูกำลังทำงาน รอให้เสร็จก่อน');

  const commandId = randomUUID();

  await query(
    `INSERT INTO gate_logs (device_id, command_id, action, source, status, requested_by, level_at_request)
     VALUES ($1,$2,$3,'MANUAL_WEB','PENDING',$4,$5)`,
    [d.id, commandId, action, user?.id ?? null, d.level]
  );

  publish(pubTopic.gateCmd(deviceCode), {
    command_id: commandId,
    action,
    issued_at: new Date().toISOString(),
  }, { qos: 1 });

  patchDevice(deviceCode, { gate: GATE.MOVING });
  emitDeviceState(deviceCode, toPublicState(getDevice(deviceCode)));

  const timer = setTimeout(() => timeoutCommand(commandId), env.gateAckTimeoutMs);
  pending.set(commandId, { timer, code: deviceCode, action, startedAt: Date.now() });

  await logEvent({
    deviceId: d.id, deviceCode, type: 'GATE_COMMAND', severity: 'INFO',
    message: `สั่ง ${action === 'OPEN' ? 'เปิด' : 'ปิด'}ประตูระบาย (รอการตอบรับจาก ESP32)`,
    metadata: { commandId, action, by: user?.username ?? 'system' },
  });

  return { commandId, status: 'PENDING', timeoutMs: env.gateAckTimeoutMs };
}

/** ack payload: { command_id, action, result: "OK"|"FAIL", gate: "OPEN"|"CLOSED", error? } */
export async function handleGateAck(deviceCode, payload) {
  const entry = pending.get(payload.command_id);
  const d = getDevice(deviceCode);
  if (!d) return;

  if (entry) { clearTimeout(entry.timer); pending.delete(payload.command_id); }

  const ok = payload.result === 'OK';
  const latency = entry ? Date.now() - entry.startedAt : null;

  await query(
    `UPDATE gate_logs SET status=$1, acked_at=NOW(), latency_ms=$2, error_message=$3
     WHERE command_id=$4`,
    [ok ? 'ACKED' : 'FAILED', latency, ok ? null : (payload.error ?? 'device reported failure'), payload.command_id]
  );

  const newGate = Object.values(GATE).includes(payload.gate)
    ? payload.gate
    : (ok ? (payload.action === 'OPEN' ? GATE.OPEN : GATE.CLOSED) : d.gate);

  patchDevice(deviceCode, { gate: newGate });
  await persistDeviceState(deviceCode);

  await logEvent({
    deviceId: d.id, deviceCode, type: ok ? 'GATE_ACK' : 'GATE_FAILED',
    severity: ok ? 'INFO' : 'ERROR',
    message: ok
      ? `ESP32 ยืนยันแล้ว — ประตูอยู่ในสถานะ ${newGate} (${latency ?? '-'} ms)`
      : `ESP32 แจ้งว่าสั่งงานไม่สำเร็จ: ${payload.error ?? 'unknown'}`,
    metadata: { commandId: payload.command_id, latency },
  });

  emitGateResult(deviceCode, { commandId: payload.command_id, status: ok ? 'ACKED' : 'FAILED', gate: newGate });
  emitDeviceState(deviceCode, toPublicState(getDevice(deviceCode)));
}

async function timeoutCommand(commandId) {
  const entry = pending.get(commandId);
  if (!entry) return;
  pending.delete(commandId);

  const d = getDevice(entry.code);
  await query(
    `UPDATE gate_logs SET status='TIMEOUT', error_message='no ack from device' WHERE command_id=$1`,
    [commandId]
  );

  patchDevice(entry.code, { gate: GATE.UNKNOWN }); // ★ ไม่ยืนยัน = ไม่รู้ ห้ามแสดงว่าเปิดสำเร็จ
  await persistDeviceState(entry.code);

  await logEvent({
    deviceId: d?.id, deviceCode: entry.code, type: 'GATE_TIMEOUT', severity: 'ERROR',
    message: `ไม่ได้รับการตอบรับจาก ESP32 ภายใน ${env.gateAckTimeoutMs} ms — สถานะประตูไม่ยืนยัน`,
    metadata: { commandId, action: entry.action },
  });

  emitGateResult(entry.code, { commandId, status: 'TIMEOUT', gate: GATE.UNKNOWN });
  emitDeviceState(entry.code, toPublicState(getDevice(entry.code)));
}

export async function requestMode({ deviceCode, mode, user = null }) {
  const d = getDevice(deviceCode);
  if (!d) throw new GateError('DEVICE_NOT_FOUND', 'ไม่พบอุปกรณ์');
  if (d.connection === CONNECTION.OFFLINE)
    throw new GateError('DEVICE_OFFLINE', 'อุปกรณ์ไม่ได้เชื่อมต่อ — สั่งงานไม่ได้');

  publish(pubTopic.modeCmd(deviceCode), { mode, issued_at: new Date().toISOString() }, { qos: 1 });

  await logEvent({
    deviceId: d.id, deviceCode, type: 'MODE_CHANGED', severity: 'WARNING',
    message: `ขอเปลี่ยนโหมดเป็น ${mode}`,
    metadata: { by: user?.username ?? 'system' },
  });

  return { requested: mode };  // สถานะจริงจะอัปเดตเมื่อ telemetry รอบถัดไปยืนยัน
}