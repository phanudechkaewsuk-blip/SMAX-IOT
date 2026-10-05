import mqtt from 'mqtt';
import { env } from '../config/env.js';
import { SUB_TOPICS } from './topics.js';
import { routeMessage } from './handlers.js';

let client = null;

export function connectMqtt() {
  client = mqtt.connect(env.mqtt.url, {
    clientId: `waterguard-backend-${Math.random().toString(16).slice(2, 10)}`,
    username: env.mqtt.username,
    password: env.mqtt.password,
    clean: true,
    reconnectPeriod: 3000,
    connectTimeout: 10000,
  });

  client.on('connect', () => {
    console.log('[mqtt] connected to', env.mqtt.url);
    client.subscribe(SUB_TOPICS, { qos: 1 }, (err, granted) => {
      if (err) return console.error('[mqtt] subscribe error', err);
      console.log('[mqtt] subscribed:', granted.map((g) => g.topic).join(', '));
    });
  });

  client.on('message', (topic, buf) => {
    routeMessage(topic, buf).catch((e) => console.error('[mqtt] handler error', e));
  });

  client.on('reconnect', () => console.warn('[mqtt] reconnecting...'));
  client.on('error', (e) => console.error('[mqtt] error', e.message));
  client.on('close', () => console.warn('[mqtt] connection closed'));

  return client;
}

export function publish(topic, payload, opts = {}) {
  if (!client?.connected) {
    console.error('[mqtt] publish failed — broker not connected:', topic);
    return false;
  }
  client.publish(topic, JSON.stringify(payload), { qos: 1, ...opts });
  return true;
}

export const isBrokerConnected = () => Boolean(client?.connected);