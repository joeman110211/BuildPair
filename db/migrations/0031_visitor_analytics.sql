CREATE TABLE IF NOT EXISTS visitor_analytics_hourly (
  bucket_start timestamptz NOT NULL,
  event_type text NOT NULL,
  dimension_key text NOT NULL,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  event_count bigint NOT NULL DEFAULT 0,
  total_value double precision NOT NULL DEFAULT 0,
  max_value double precision,
  PRIMARY KEY (bucket_start, event_type, dimension_key)
);
CREATE INDEX IF NOT EXISTS visitor_analytics_hourly_bucket_idx ON visitor_analytics_hourly(bucket_start DESC);
CREATE INDEX IF NOT EXISTS visitor_analytics_hourly_event_idx ON visitor_analytics_hourly(event_type, bucket_start DESC);

CREATE TABLE IF NOT EXISTS visitor_sessions (
  id uuid PRIMARY KEY,
  visitor_id uuid NOT NULL,
  consented_at timestamptz NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  landing_path text,
  last_path text,
  referrer_host text,
  acquisition jsonb NOT NULL DEFAULT '{}'::jsonb,
  device jsonb NOT NULL DEFAULT '{}'::jsonb,
  geo jsonb NOT NULL DEFAULT '{}'::jsonb,
  converted boolean NOT NULL DEFAULT false,
  converted_at timestamptz
);
CREATE INDEX IF NOT EXISTS visitor_sessions_visitor_time_idx ON visitor_sessions(visitor_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS visitor_sessions_last_seen_idx ON visitor_sessions(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS visitor_sessions_conversion_idx ON visitor_sessions(converted, started_at DESC);

CREATE TABLE IF NOT EXISTS visitor_session_events (
  id bigserial PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES visitor_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  path text,
  target text,
  value double precision,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS visitor_session_events_session_time_idx ON visitor_session_events(session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS visitor_session_events_type_time_idx ON visitor_session_events(event_type, created_at DESC);
