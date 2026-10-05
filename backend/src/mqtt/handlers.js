import { parseTopic } from './topics.js';
import { hasDevice, getDevice } from '../services/deviceRegistry.js';
import { markAlive, markOffline } from '../services/statusManager.js';
import { handleTelemetry } from '../services/telemetryService.js';
import { handleGateAck } from '../services/gateService.js';
import { logEvent } from '../services/eventService.js';

function parseJson(buf) {
  try { return JSON.parse(buf.toString()); } catch { return null; }
}

export async function routeMessage(topic, buf) {
  const parsed = parseTopic(topic);
  if (!parsed) return;

  const { code, kind } = parsed;
  if (!hasDevice(code)) {
    console.warn(`[mqtt] unknown device "${code}" — ignored`);
    return;
  }

  const raw = buf.toString();
  const payload = parseJson(buf);

  switch (kind) {
    case 'heartbeat':
      await markAlive(code, { firmware: payload?.fw });
      break;

    case 'telemetry':
      if (payload) await handleTelemetry(code, payload);
      break;

    // ★ LWT: ESP32 ลงทะเบียนไว้ตอน connect → broker ส่งให้เองเมื่อสายหลุด
    case 'status': {
      const state = (payload?.state ?? raw).toString().toLowerCase();
      if (state.includes('offline')) await markOffline(code, 'LWT');
      else if (state.includes('online')) await markAlive(code, { firmware: payload?.fw });
      break;
    }

    case 'gate/ack':
      if (payload) await handleGateAck(code, payload);
      break;

    case 'event': {
      const d = getDevice(code);
      await logEvent({
        deviceId: d.id, deviceCode: code,
        type: payload?.type ?? 'DEVICE_EVENT',
        severity: payload?.severity ?? 'INFO',
        message: payload?.message ?? raw,
        metadata: payload ?? null,
      });
      break;
    }

    default:
      console.warn('[mqtt] unhandled topic', topic);
  }
}