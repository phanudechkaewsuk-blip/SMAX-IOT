import { useCallback, useEffect, useState } from 'react';
import { STATUS } from '../constants/waterLevel';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000';
const DEVICE_CODE = import.meta.env.VITE_DEVICE_CODE ?? 'ESP32-01';
const POLL_MS = 3000;

const UNKNOWN_STATUS = {
  key: 'UNKNOWN',
  label: 'ไม่ทราบสถานะ',
  labelEn: 'UNKNOWN',
  range: '-',
  hex: '#64748b',
  text: 'text-slate-400',
  bgSolid: 'bg-slate-500',
  bgSoft: 'bg-slate-500/10',
  border: 'border-slate-500/40',
  dot: 'bg-slate-400',
  buzzer: false,
};

const FALLBACK_DEVICE = {
  deviceCode: DEVICE_CODE,
  connection: 'OFFLINE',
  sensorOk: false,
  level: null,
  status: 'UNKNOWN',
  mode: null,
  gate: 'UNKNOWN',
  canControl: false,
  lastSeenAt: null,
};

export default function useIoTData() {
  const [device, setDevice] = useState(FALLBACK_DEVICE);
  const [history, setHistory] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [muted, setMuted] = useState(false);
  const [log, setLog] = useState([]);

  const pushLog = useCallback((text, tone = 'info') => {
    setLog((prev) => [
      { id: Date.now() + Math.random(), text, tone, at: new Date() },
      ...prev,
    ].slice(0, 12));
  }, []);

  const requestJson = useCallback(async (path, options) => {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.json();
  }, []);

  const refresh = useCallback(async () => {
    try {
      const devicesPayload = await requestJson('/api/devices');
      const nextDevice =
        devicesPayload.devices?.find((item) => item.deviceCode === DEVICE_CODE) ??
        devicesPayload.devices?.[0] ??
        FALLBACK_DEVICE;

      setDevice(nextDevice);
      setLastUpdate(Date.now());

      const readings = await requestJson(`/api/readings/${nextDevice.deviceCode}?limit=40`);
      setHistory(readings.map((point) => ({
        t: new Date(point.t).toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        level: point.level,
      })));
    } catch (error) {
      setDevice((prev) => ({ ...prev, connection: 'OFFLINE', sensorOk: false }));
      pushLog(`API connection failed: ${error.message}`, 'error');
    }
  }, [pushLog, requestJson]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  const toggleMode = useCallback(async () => {
    if (!device.mode) return;
    const mode = device.mode === 'AUTO' ? 'MANUAL' : 'AUTO';
    try {
      await requestJson(`/api/devices/${device.deviceCode}/mode`, {
        method: 'POST',
        body: JSON.stringify({ mode }),
      });
      pushLog(`Requested mode change to ${mode}`, 'warn');
      await refresh();
    } catch (error) {
      pushLog(`Mode command failed: ${error.message}`, 'error');
    }
  }, [device.deviceCode, device.mode, pushLog, refresh, requestJson]);

  const commandGate = useCallback(async (action) => {
    try {
      await requestJson(`/api/devices/${device.deviceCode}/gate`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      pushLog(`Requested gate ${action}`, 'warn');
      await refresh();
    } catch (error) {
      pushLog(`Gate command failed: ${error.message}`, 'error');
    }
  }, [device.deviceCode, pushLog, refresh, requestJson]);

  const status = STATUS[device.status] ?? UNKNOWN_STATUS;
  const level = device.level ?? 0;
  const connection = device.connection ?? 'OFFLINE';
  const sensorOk = Boolean(device.sensorOk);
  const isStale = Date.now() - lastUpdate > POLL_MS * 4;

  return {
    level,
    status,
    mode: device.mode ?? 'AUTO',
    gate: device.gate === 'UNKNOWN' ? 'CLOSED' : device.gate,
    connection,
    sensorOk,
    history,
    lastUpdate,
    isStale,
    log,
    muted,
    setMuted,
    toggleMode,
    commandGate,
  };
}
