import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { listDevices, toPublicState } from '../services/deviceRegistry.js';

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigin, methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    console.log('[ws] client connected', socket.id);

    // ส่ง snapshot ทันทีที่ต่อ — frontend จะได้รู้สถานะจริงตั้งแต่วินาทีแรก
    socket.emit('snapshot', listDevices().map(toPublicState));

    socket.on('subscribe:device', (code) => socket.join(`device:${code}`));
    socket.on('unsubscribe:device', (code) => socket.leave(`device:${code}`));
    socket.on('disconnect', () => console.log('[ws] client disconnected', socket.id));
  });

  console.log('[ws] socket.io ready');
  return io;
}

const room = (code) => `device:${code}`;

export const emitDeviceState = (code, state) => io?.emit('device:state', state) && io?.to(room(code)).emit('device:state', state);
export const emitReading     = (code, r)     => io?.emit('device:reading', { deviceCode: code, ...r });
export const emitEvent       = (code, e)     => io?.emit('system:event', e);
export const emitAlert       = (code, a)     => io?.emit('alert:new', a);
export const emitGateResult  = (code, r)     => io?.emit('gate:result', { deviceCode: code, ...r });