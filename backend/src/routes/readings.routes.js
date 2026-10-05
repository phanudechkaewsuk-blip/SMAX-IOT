import { Router } from 'express';
import { query } from '../db/pool.js';
import { getDevice } from '../services/deviceRegistry.js';

export const readingsRouter = Router();

readingsRouter.get('/:code', async (req, res) => {
  const d = getDevice(req.params.code);
  if (!d) return res.status(404).json({ error: 'DEVICE_NOT_FOUND' });

  const limit = Math.min(Number(req.query.limit) || 60, 1000);
  const { from, to } = req.query;

  const { rows } = await query(
    `SELECT level_cm, status, sensor_ok, recorded_at
     FROM water_readings
     WHERE device_id = $1
       AND ($2::timestamptz IS NULL OR recorded_at >= $2)
       AND ($3::timestamptz IS NULL OR recorded_at <= $3)
     ORDER BY recorded_at DESC LIMIT $4`,
    [d.id, from ?? null, to ?? null, limit]
  );

  res.json(rows.reverse().map((r) => ({
    t: r.recorded_at,
    level: r.level_cm === null ? null : Number(r.level_cm),
    status: r.status,
    sensorOk: r.sensor_ok,
  })));
});