CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS monitors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET' CHECK (method IN ('GET', 'HEAD')),
  interval_minutes INTEGER NOT NULL DEFAULT 5 CHECK (interval_minutes IN (5, 10, 15, 30, 60)),
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('unknown', 'operational', 'degraded', 'down')),
  failure_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  timeout_ms INTEGER NOT NULL DEFAULT 10000,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_public INTEGER NOT NULL DEFAULT 0,
  public_slug TEXT UNIQUE,
  alert_webhook_url TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS checks (
  id TEXT PRIMARY KEY,
  monitor_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure')),
  status_code INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  checked_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (monitor_id) REFERENCES monitors(id)
);

CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  monitor_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  resolved_at TEXT,
  failure_reason TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (monitor_id) REFERENCES monitors(id)
);

CREATE TABLE IF NOT EXISTS alert_logs (
  id TEXT PRIMARY KEY,
  monitor_id TEXT NOT NULL,
  incident_id TEXT,
  alert_type TEXT NOT NULL,
  sent_to TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (monitor_id) REFERENCES monitors(id),
  FOREIGN KEY (incident_id) REFERENCES incidents(id)
);

CREATE TABLE IF NOT EXISTS daily_stats (
  id TEXT PRIMARY KEY,
  monitor_id TEXT NOT NULL,
  day TEXT NOT NULL,
  total_checks INTEGER NOT NULL DEFAULT 0,
  successful_checks INTEGER NOT NULL DEFAULT 0,
  failed_checks INTEGER NOT NULL DEFAULT 0,
  avg_response_time_ms REAL,
  p95_response_time_ms REAL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(monitor_id, day),
  FOREIGN KEY (monitor_id) REFERENCES monitors(id)
);

CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  route TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_monitors_user_id ON monitors(user_id);
CREATE INDEX IF NOT EXISTS idx_monitors_active ON monitors(is_active);
CREATE INDEX IF NOT EXISTS idx_monitors_public_slug ON monitors(public_slug);
CREATE INDEX IF NOT EXISTS idx_checks_monitor_id_checked_at ON checks(monitor_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_monitor_id_status ON incidents(monitor_id, status);
CREATE INDEX IF NOT EXISTS idx_alert_logs_monitor_id ON alert_logs(monitor_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_route ON rate_limits(identifier, route);
CREATE INDEX IF NOT EXISTS idx_daily_stats_monitor_day ON daily_stats(monitor_id, day DESC);
