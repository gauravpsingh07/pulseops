-- PulseOps feature migration: daily uptime rollups, status boards, heartbeat monitors.
-- Apply to an existing database (local then remote):
--   corepack pnpm --filter worker exec wrangler d1 execute pulseops-db --local --file=src/db/migrations/002_features.sql
--   corepack pnpm --filter worker exec wrangler d1 execute pulseops-db --remote --file=src/db/migrations/002_features.sql
-- Fresh databases only need schema.sql, which already includes everything here.

-- 90-day uptime bars: one aggregated row per monitor per UTC day.
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

CREATE INDEX IF NOT EXISTS idx_daily_stats_monitor_day ON daily_stats(monitor_id, day DESC);

-- Backfill daily rollups from retained checks (about 30 days of history).
-- p95 stays NULL for backfilled days; new days get it from the worker.
INSERT OR IGNORE INTO daily_stats (
  id, monitor_id, day, total_checks, successful_checks, failed_checks, avg_response_time_ms
)
SELECT
  'day_' || lower(hex(randomblob(12))),
  monitor_id,
  date(checked_at),
  COUNT(*),
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END),
  SUM(CASE WHEN status = 'failure' THEN 1 ELSE 0 END),
  AVG(CASE WHEN status = 'success' THEN response_time_ms END)
FROM checks
GROUP BY monitor_id, date(checked_at);

-- Combined status boards: one public page per user.
-- NOTE: ALTER TABLE has no IF NOT EXISTS in SQLite, so run this migration once.
ALTER TABLE users ADD COLUMN board_slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_board_slug ON users(board_slug);
