import pg from 'pg';
import { env } from '../config/env.js';

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => console.error('[pg] unexpected error', err));

export const query = (text, params) => pool.query(text, params);

export async function assertDbConnection() {
  const { rows } = await query('SELECT NOW() AS now');
  console.log('[pg] connected at', rows[0].now);
}