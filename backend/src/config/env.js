import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

const num = (v, d) => (v ? Number(v) : d);

export const env = {
  port: num(process.env.PORT, 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL,
  mqtt: {
    url: process.env.MQTT_URL ?? 'mqtt://localhost:1883',
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    baseTopic: process.env.MQTT_BASE_TOPIC ?? 'waterguard',
  },
  heartbeat: {
    intervalMs: num(process.env.HEARTBEAT_INTERVAL_MS, 30000),
    missLimit: num(process.env.HEARTBEAT_MISS_LIMIT, 3),
    scanMs: num(process.env.STATUS_SCAN_INTERVAL_MS, 5000),
  },
  gateAckTimeoutMs: num(process.env.GATE_ACK_TIMEOUT_MS, 8000),
};

// ONLINE ถ้าเห็น heartbeat ภายใน 1 รอบ + grace
export const ONLINE_WINDOW_MS = env.heartbeat.intervalMs * 1.5;
// OFFLINE เมื่อขาด 3 รอบ (90s) + grace 5s
export const OFFLINE_WINDOW_MS = env.heartbeat.intervalMs * env.heartbeat.missLimit + 5000;
