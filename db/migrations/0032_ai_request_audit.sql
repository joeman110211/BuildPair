CREATE TABLE IF NOT EXISTS ai_request_logs (
  id bigserial PRIMARY KEY,
  user_id text,
  endpoint text NOT NULL,
  request_text text NOT NULL,
  response_text text,
  status text NOT NULL,
  model text,
  provider_called boolean NOT NULL DEFAULT false,
  latency_ms integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_request_logs_status_check CHECK (status IN ('success', 'fallback', 'error', 'blocked'))
);

CREATE INDEX IF NOT EXISTS ai_request_logs_created_idx ON ai_request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS ai_request_logs_endpoint_created_idx ON ai_request_logs(endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_request_logs_user_created_idx ON ai_request_logs(user_id, created_at DESC);
