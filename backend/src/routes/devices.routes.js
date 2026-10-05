import { Router } from 'express';
import { listDevices, getDevice, toPublicState } from '../services/deviceRegistry.js';
import { requestGate, requestMode, GateError } from '../services/gateService.js';
import { isBrokerConnected } from '../mqtt/client.js';
import { query } from '../db/pool.js';

export const devicesRouter = Router();

// TODO (Iteration 3): แทนที่ด้วย JWT middleware จริง
const fakeUser = (req, _res, next) => {
  req.user = { id: null, username: 'operator-dev', role: 'OPERATOR' };
  next();
};
const requireOperator = (req, res, next) =>
  ['OPERATOR', 'ADMIN'].includes(req.user?.role)
    ? next()
    : res.status(403).json({ error: 'FORBIDDEN', message: 'ไม่มีสิทธิ์ควบคุมอุปกรณ์' });

devicesRouter.get('/', (_req, res) => {
  res.json({ brokerConnected: isBrokerConnected(), devices: listDevices().map(toPublicState) });
});

devicesRouter.get('/:code', (req, res) => {
  const d = getDevice(req.params.code);
  if (!d) return res.status(404).json({ error: 'DEVICE_NOT_FOUND' });
  res.json(toPublicState(d));
});

devicesRouter.post('/:code/gate', fakeUser, requireOperator, async (req, res) => {
  const action = String(req.body?.action ?? '').toUpperCase();
  if (!['OPEN', 'CLOSE'].includes(action))
    return res.status(400).json({ error: 'INVALID_ACTION', message: 'action ต้องเป็น OPEN หรือ CLOSE' });

  try {
    const result = await requestGate({ deviceCode: req.params.code, action, user: req.user });
    res.status(202).json(result);   // 202 = รับคำสั่งแล้ว กำลังรอ Ack จาก ESP32
  } catch (e) {
    if (e instanceof GateError) return res.status(409).json({ error: e.code, message: e.message });
    console.error(e);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

devicesRouter.post('/:code/mode', fakeUser, requireOperator, async (req, res) => {
  const mode = String(req.body?.mode ?? '').toUpperCase();
  if (!['AUTO', 'MANUAL'].includes(mode))
    return res.status(400).json({ error: 'INVALID_MODE' });

  try {
    res.status(202).json(await requestMode({ deviceCode: req.params.code, mode, user: req.user }));
  } catch (e) {
    if (e instanceof GateError) return res.status(409).json({ error: e.code, message: e.message });
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

devicesRouter.get('/:code/events', async (req, res) => {
  const d = getDevice(req.params.code);
  if (!d) return res.status(404).json({ error: 'DEVICE_NOT_FOUND' });
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const { rows } = await query(
    `SELECT id, event_type, severity, message, metadata, created_at
     FROM system_events WHERE device_id=$1 ORDER BY created_at DESC LIMIT $2`,
    [d.id, limit]
  );
  res.json(rows);
});