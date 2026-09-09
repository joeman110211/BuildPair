#!/usr/bin/env bash
set -Eeuo pipefail

# BuildPair deploy runner for the existing Chromebook PM2 + named Cloudflare tunnel setup.
REPO_DIR="${BUILDPAIR_REPO_DIR:-/home/jloveridge1102/BuildPair}"
BRANCH="${BUILDPAIR_DEPLOY_BRANCH:-main}"
PUBLIC_ORIGIN="${BUILDPAIR_PUBLIC_ORIGIN:-https://www.buildpair.co.uk}"
HEALTH_URL="${BUILDPAIR_HEALTH_URL:-$PUBLIC_ORIGIN/api/health}"
READINESS_URL="${BUILDPAIR_READINESS_URL:-$PUBLIC_ORIGIN/api/readiness}"
if [[ -n "${BUILDPAIR_ENV_FILE:-}" ]]; then
  ENV_FILE="$BUILDPAIR_ENV_FILE"
elif [[ -f "$REPO_DIR/.env.local" ]]; then
  ENV_FILE="$REPO_DIR/.env.local"
else
  ENV_FILE="$REPO_DIR/.env"
fi
LOCK_FILE="${BUILDPAIR_DEPLOY_LOCK:-/tmp/buildpair-deploy.lock}"
FAILED_SHA_FILE="${BUILDPAIR_FAILED_SHA_FILE:-$HOME/.buildpair-last-failed-sha}"
DEPLOYED_SHA_FILE="${BUILDPAIR_DEPLOYED_SHA_FILE:-$HOME/.buildpair-last-deployed-sha}"

log() {
  printf '[%s] %s\n' "$(date -Is)" "$*"
}

health_response_ok() {
  local response="$1"
  node -e '
    try {
      const data = JSON.parse(process.argv[1]);
      process.exit(data.status === "ok" && data.database === "ok" ? 0 : 1);
    } catch {
      process.exit(1);
    }
  ' "$response" >/dev/null 2>&1
}

readiness_response_ok() {
  local response="$1"
  node -e '
    try {
      const data = JSON.parse(process.argv[1]);
      process.exit(data.status === "ready" && data.ready === true ? 0 : 1);
    } catch {
      process.exit(1);
    }
  ' "$response" >/dev/null 2>&1
}

wait_for_health() {
  local url="$1"
  local label="$2"
  local response=""
  for attempt in $(seq 1 30); do
    response="$(curl --fail --silent --show-error --connect-timeout 2 --max-time 5 "$url" 2>/dev/null || true)"
    if [[ -n "$response" ]] && health_response_ok "$response"; then
      log "$label health check passed on attempt $attempt."
      return 0
    fi
    sleep 2
  done
  log "$label health check failed after 60 seconds. Last response: ${response:-<no response>}"
  return 1
}

wait_for_readiness() {
  local url="$1"
  local label="$2"
  local response=""
  for attempt in $(seq 1 30); do
    response="$(curl --silent --show-error --connect-timeout 2 --max-time 5 "$url" 2>/dev/null || true)"
    if [[ -n "$response" ]] && readiness_response_ok "$response"; then
      log "$label readiness check passed on attempt $attempt."
      return 0
    fi
    sleep 2
  done
  log "$label readiness check failed after 60 seconds. Last response: ${response:-<no response>}"
  return 1
}

env_value() {
  local name="$1"
  node --env-file="$ENV_FILE" -e 'const value = process.env[process.argv[1]] || ""; process.stdout.write(value);' "$name"
}

build_web() {
  local clerk_publishable_key build_sha
  clerk_publishable_key="$(env_value EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY)"
  build_sha="$(git rev-parse HEAD)"
  log "Building web output for $PUBLIC_ORIGIN..."
  EXPO_PUBLIC_API_URL="$PUBLIC_ORIGIN" \
  APP_URL="$PUBLIC_ORIGIN" \
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY="$clerk_publishable_key" \
  BUILDPAIR_BUILD_SHA="$build_sha" \
  BUILDPAIR_PREVIEW_DATA_ENABLED=false \
  npm run build:web
}

restart_buildpair() {
  local clerk_publishable_key build_sha
  clerk_publishable_key="$(env_value EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY)"
  build_sha="$(git rev-parse HEAD)"
  EXPO_PUBLIC_API_URL="$PUBLIC_ORIGIN" \
  APP_URL="$PUBLIC_ORIGIN" \
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY="$clerk_publishable_key" \
  BUILDPAIR_BUILD_SHA="$build_sha" \
  BUILDPAIR_PREVIEW_DATA_ENABLED=false \
  pm2 restart buildpair --update-env >/dev/null
  pm2 save >/dev/null
}

write_deployed_sha() {
  printf '%s\n' "$1" > "$DEPLOYED_SHA_FILE"
  chmod 600 "$DEPLOYED_SHA_FILE"
}

cd "$REPO_DIR"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "Another deployment is already running; exiting."
  exit 0
fi

if [[ ! -f "$ENV_FILE" ]]; then
  log "Required runtime environment file is missing: $ENV_FILE"
  exit 4
fi

missing_env="$({ node --env-file="$ENV_FILE" - <<'NODE'
const required = [
  'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'DATABASE_URL',
  'GEMINI_API_KEY',
  'RESEND_API_KEY',
  'INVOICE_FROM_EMAIL',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];
const missing = required.filter((name) => !process.env[name]?.trim());
process.stdout.write(missing.join('\n'));
NODE
} 2>/dev/null || true)"

if [[ -n "$missing_env" ]]; then
  log "Deployment blocked because required runtime values are missing from $ENV_FILE:"
  printf '%s\n' "$missing_env"
  exit 4
fi

if ! command -v pm2 >/dev/null 2>&1; then
  log "PM2 is required for the Chromebook runtime but was not found."
  exit 5
fi

if ! pm2 describe buildpair >/dev/null 2>&1; then
  log "PM2 process 'buildpair' is not configured."
  exit 5
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  log "Tracked local changes detected; refusing automatic deployment."
  git status --short
  exit 2
fi

log "Checking origin/$BRANCH for changes..."
git fetch --quiet origin "$BRANCH"

LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"
DEPLOYED_SHA=""
[[ ! -f "$DEPLOYED_SHA_FILE" ]] || DEPLOYED_SHA="$(cat "$DEPLOYED_SHA_FILE")"

if [[ "$LOCAL_SHA" == "$REMOTE_SHA" && "$DEPLOYED_SHA" == "$REMOTE_SHA" ]]; then
  log "Already deployed at ${REMOTE_SHA:0:12}."
  exit 0
fi

if [[ -f "$FAILED_SHA_FILE" ]] && [[ "$(cat "$FAILED_SHA_FILE")" == "$REMOTE_SHA" ]]; then
  log "Skipping ${REMOTE_SHA:0:12}; this revision previously failed deployment. Waiting for a newer commit."
  exit 0
fi

if [[ "$LOCAL_SHA" != "$REMOTE_SHA" ]] && ! git merge-base --is-ancestor "$LOCAL_SHA" "$REMOTE_SHA"; then
  log "Local branch has diverged from origin/$BRANCH; refusing automatic deployment."
  exit 3
fi

ROLLBACK_SHA="$LOCAL_SHA"
if [[ -n "$DEPLOYED_SHA" ]] && git cat-file -e "$DEPLOYED_SHA^{commit}" 2>/dev/null; then
  ROLLBACK_SHA="$DEPLOYED_SHA"
fi

BASE_SHA="$ROLLBACK_SHA"
CHANGED_FILES="$(git diff --name-only "$BASE_SHA" "$REMOTE_SHA" 2>/dev/null || true)"
NEEDS_NPM_CI=false
if [[ ! -d node_modules ]] \
  || [[ ! -x node_modules/.bin/tsc ]] \
  || [[ ! -x node_modules/.bin/expo ]] \
  || grep -Eq '^(package\.json|package-lock\.json)$' <<<"$CHANGED_FILES"; then
  NEEDS_NPM_CI=true
fi

rollback() {
  log "Deployment failed. Marking ${REMOTE_SHA:0:12} as failed and rolling back to ${ROLLBACK_SHA:0:12}..."
  printf '%s\n' "$REMOTE_SHA" > "$FAILED_SHA_FILE"
  chmod 600 "$FAILED_SHA_FILE"
  git reset --hard "$ROLLBACK_SHA"
  npm ci
  build_web
  restart_buildpair || true
  if wait_for_health "http://localhost:3000/api/health" "Rollback local API" \
    && wait_for_readiness "http://localhost:3000/api/readiness" "Rollback local API"; then
    write_deployed_sha "$ROLLBACK_SHA"
  else
    log "Rollback process finished, but local API health/readiness could not be confirmed."
  fi
  log "Rollback completed. This failed revision will not be retried unless GitHub changes again."
}

DEPLOY_ACTIVE=false
on_error() {
  code=$?
  if [[ "$DEPLOY_ACTIVE" == true ]]; then
    trap - ERR
    rollback || true
  fi
  exit "$code"
}
trap on_error ERR

if [[ "$LOCAL_SHA" != "$REMOTE_SHA" ]]; then
  log "Deploying ${LOCAL_SHA:0:12} -> ${REMOTE_SHA:0:12}..."
  git merge --ff-only "$REMOTE_SHA"
else
  log "Repository is at ${REMOTE_SHA:0:12}, but that revision is not marked successfully deployed. Resuming deployment..."
fi
DEPLOY_ACTIVE=true

if [[ "$NEEDS_NPM_CI" == true ]]; then
  log "Dependencies missing or changed; installing locked dependencies..."
  npm ci
else
  log "Dependencies unchanged and toolchain present; skipping npm ci."
fi

log "Running TypeScript checks..."
npm run typecheck
log "Running unit tests..."
npm test
log "Applying pending database migrations..."
node --env-file="$ENV_FILE" scripts/migrate.mjs
build_web

log "Restarting BuildPair through PM2..."
restart_buildpair

log "Waiting for local API health..."
wait_for_health "http://localhost:3000/api/health" "Local API"
log "Waiting for local API readiness..."
wait_for_readiness "http://localhost:3000/api/readiness" "Local API"

# A Cloudflare tunnel outage is an infrastructure problem, not a bad application
# revision. Rolling back a healthy PM2 app cannot repair the tunnel and used to
# trap BuildPair on an old commit. Keep the healthy revision deployed and report
# public reachability separately so the tunnel can recover without losing code.
log "Checking public Cloudflare health..."
if wait_for_health "$HEALTH_URL" "Public production"; then
  log "Checking public Cloudflare readiness..."
  if ! wait_for_readiness "$READINESS_URL" "Public production"; then
    log "WARNING: BuildPair is healthy locally, but public production readiness is unavailable. Leaving the healthy revision deployed."
  fi
else
  log "WARNING: BuildPair is healthy locally, but the Cloudflare tunnel is currently unreachable. Leaving the healthy revision deployed."
fi

write_deployed_sha "$REMOTE_SHA"
rm -f "$FAILED_SHA_FILE"
DEPLOY_ACTIVE=false
trap - ERR
log "Deployment complete: ${REMOTE_SHA:0:12} is healthy locally. Public tunnel status was checked separately."
