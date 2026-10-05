-- ============================================================
-- WaterGuard IoT — Schema Initialization
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------- ENUM TYPES ----------
   DO $$ BEGIN CREATE TYPE user_role     AS ENUM ('VIEWER','OPERATOR','ADMIN');                       EXCEPTION WHEN duplicate_object THEN NULL; END $$;
   DO $$ BEGIN CREATE TYPE device_mode   AS ENUM ('AUTO','MANUAL');                                   EXCEPTION WHEN duplicate_object THEN NULL; END $$;
   DO $$ BEGIN CREATE TYPE gate_state    AS ENUM ('OPEN','CLOSED','MOVING','UNKNOWN');                EXCEPTION WHEN duplicate_object THEN NULL; END $$;
   DO $$ BEGIN CREATE TYPE conn_state    AS ENUM ('ONLINE','RECONNECTING','OFFLINE');                 EXCEPTION WHEN duplicate_object THEN NULL; END $$;
   DO $$ BEGIN CREATE TYPE water_status  AS ENUM ('SAFE','WARNING','CRITICAL','UNKNOWN');             EXCEPTION WHEN duplicate_object THEN NULL; END $$;
   DO $$ BEGIN CREATE TYPE gate_action   AS ENUM ('OPEN','CLOSE');                                    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
   DO $$ BEGIN CREATE TYPE cmd_source    AS ENUM ('AUTO_LOCAL','AUTO_SERVER','MANUAL_WEB');           EXCEPTION WHEN duplicate_object THEN NULL; END $$;
   DO $$ BEGIN CREATE TYPE cmd_status    AS ENUM ('PENDING','ACKED','FAILED','TIMEOUT');              EXCEPTION WHEN duplicate_object THEN NULL; END $$;
   DO $$ BEGIN CREATE TYPE severity_lvl  AS ENUM ('INFO','WARNING','ERROR','CRITICAL');               EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- 1. USERS ----------
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(50)  NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(120),
  role          user_role    NOT NULL DEFAULT 'VIEWER',
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------- 2. DEVICES ----------
CREATE TABLE IF NOT EXISTS devices (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code            VARCHAR(50)  NOT NULL UNIQUE,   -- เช่น ESP32-01
  name                   VARCHAR(120) NOT NULL,
  location               VARCHAR(255),
  tank_height_cm         NUMERIC(6,2) NOT NULL DEFAULT 20.00,
  threshold_warning_cm   NUMERIC(6,2) NOT NULL DEFAULT 9.00,
  threshold_critical_cm  NUMERIC(6,2) NOT NULL DEFAULT 15.00,
  mode                   device_mode  NOT NULL DEFAULT 'AUTO',
  gate_state             gate_state   NOT NULL DEFAULT 'UNKNOWN',
  connection_state       conn_state   NOT NULL DEFAULT 'OFFLINE',
  sensor_ok              BOOLEAN      NOT NULL DEFAULT FALSE,
  last_level_cm          NUMERIC(6,2),
  last_status            water_status NOT NULL DEFAULT 'UNKNOWN',
  last_seen_at           TIMESTAMPTZ,
  firmware_version       VARCHAR(30),
  is_active              BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_thresholds CHECK (threshold_warning_cm < threshold_critical_cm)
);
CREATE INDEX IF NOT EXISTS idx_devices_code ON devices(device_code);

-- ---------- 3. WATER READINGS ----------
CREATE TABLE IF NOT EXISTS water_readings (
  id               BIGSERIAL PRIMARY KEY,
  device_id        UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  level_cm         NUMERIC(6,2),          -- NULL = sensor error
  raw_distance_cm  NUMERIC(6,2),
  status           water_status NOT NULL DEFAULT 'UNKNOWN',
  sensor_ok        BOOLEAN NOT NULL DEFAULT TRUE,
  gate_state       gate_state,
  mode             device_mode,
  recorded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_readings_device_time ON water_readings(device_id, recorded_at DESC);

-- ---------- 4. ALERTS ----------
CREATE TABLE IF NOT EXISTS alerts (
  id               BIGSERIAL PRIMARY KEY,
  device_id        UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  alert_type       VARCHAR(60) NOT NULL,   -- LEVEL_CRITICAL | LEVEL_WARNING | SENSOR_FAIL | DEVICE_OFFLINE
  severity         severity_lvl NOT NULL DEFAULT 'WARNING',
  level_cm         NUMERIC(6,2),
  message          TEXT NOT NULL,
  is_acknowledged  BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at  TIMESTAMPTZ,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerts_device_time ON alerts(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_open ON alerts(device_id) WHERE is_acknowledged = FALSE;

-- ---------- 5. GATE LOGS ----------
CREATE TABLE IF NOT EXISTS gate_logs (
  id               BIGSERIAL PRIMARY KEY,
  device_id        UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  command_id       UUID NOT NULL UNIQUE,
  action           gate_action NOT NULL,
  source           cmd_source  NOT NULL,
  status           cmd_status  NOT NULL DEFAULT 'PENDING',
  requested_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  level_at_request NUMERIC(6,2),
  requested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acked_at         TIMESTAMPTZ,
  latency_ms       INTEGER,
  error_message    TEXT
);
CREATE INDEX IF NOT EXISTS idx_gatelogs_device_time ON gate_logs(device_id, requested_at DESC);

-- ---------- 6. SYSTEM EVENTS ----------
CREATE TABLE IF NOT EXISTS system_events (
  id          BIGSERIAL PRIMARY KEY,
  device_id   UUID REFERENCES devices(id) ON DELETE CASCADE,
  event_type  VARCHAR(60)  NOT NULL,   -- DEVICE_ONLINE | DEVICE_OFFLINE | LWT_RECEIVED | SENSOR_FAIL |
                                        -- SENSOR_RECOVERED | MODE_CHANGED | GATE_ACK | GATE_TIMEOUT | STATE_CHANGED
  severity    severity_lvl NOT NULL DEFAULT 'INFO',
  message     TEXT NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_device_time ON system_events(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON system_events(event_type);

-- ---------- TRIGGER: updated_at ----------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated   ON users;
DROP TRIGGER IF EXISTS trg_devices_updated ON devices;
CREATE TRIGGER trg_users_updated   BEFORE UPDATE ON users   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_devices_updated BEFORE UPDATE ON devices FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- SEED ----------
INSERT INTO devices (device_code, name, location)
VALUES ('ESP32-01', 'สถานีเฝ้าระวังน้ำ — จุดที่ 01', 'คลองสายหลัก จุดที่ 01')
ON CONFLICT (device_code) DO NOTHING;