// src/server.js
import http from 'node:http';
import { env } from './config/env.js';
import { createApp } from './app.js';
import { assertDbConnection, pool } from './db/pool.js';
import { loadDevices } from './services/deviceRegistry.js';
import { connectMqtt } from './mqtt/client.js';
import { startStatusManager, stopStatusManager } from './services/statusManager.js';
import { initSocket } from './ws/socket.js';

async function bootstrap() {
  await assertDbConnection();
  await loadDevices();            // ทุกอุปกรณ์เริ่มต้นเป็น OFFLINE เสมอ

  const app = createApp();
  const server = http.createServer(app);

  server.on('error', async (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[http] port ${env.port} is already in use. Stop the existing server or set PORT to another value.`);
    } else {
      console.error('[http] server error', err);
    }
    await pool.end();
    process.exit(1);
  });

  server.listen(env.port, () => {
    console.log(`[http] listening on http://localhost:${env.port}`);
    initSocket(server);
    connectMqtt();
    startStatusManager();
  });

  const shutdown = async (sig) => {
    console.log(`\n[sys] ${sig} — shutting down`);
    stopStatusManager();
    server.close();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((e) => { console.error('[boot] failed', e); process.exit(1); });
