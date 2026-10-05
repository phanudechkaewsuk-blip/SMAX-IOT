import { env } from '../config/env.js';

const B = env.mqtt.baseTopic;

export const SUB_TOPICS = [
  `${B}/+/telemetry`,
  `${B}/+/heartbeat`,
  `${B}/+/status`,     // LWT (retained)
  `${B}/+/gate/ack`,
  `${B}/+/event`,
];

export const pubTopic = {
  gateCmd:   (code) => `${B}/${code}/cmd/gate`,
  modeCmd:   (code) => `${B}/${code}/cmd/mode`,
  configCmd: (code) => `${B}/${code}/cmd/config`,
  ping:      (code) => `${B}/${code}/cmd/ping`,
};

/** waterguard/ESP32-01/gate/ack → { code:'ESP32-01', kind:'gate/ack' } */
export function parseTopic(topic) {
  const parts = topic.split('/');
  if (parts[0] !== B || parts.length < 3) return null;
  return { code: parts[1], kind: parts.slice(2).join('/') };
}