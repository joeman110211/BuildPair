#!/usr/bin/env bash
set -u

REPO_DIR="${BUILDPAIR_REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
PUBLIC_ORIGIN="${BUILDPAIR_PUBLIC_ORIGIN:-https://www.buildpair.co.uk}"
if [[ -n "${BUILDPAIR_ENV_FILE:-}" ]]; then
  ENV_FILE="$BUILDPAIR_ENV_FILE"
elif [[ -f "$REPO_DIR/.env.local" ]]; then
  ENV_FILE="$REPO_DIR/.env.local"
else
  ENV_FILE="$REPO_DIR/.env"
fi
DEPLOYED_SHA_FILE="${BUILDPAIR_DEPLOYED_SHA_FILE:-$HOME/.buildpair-last-deployed-sha}"
FAILED_SHA_FILE="${BUILDPAIR_FAILED_SHA_FILE:-$HOME/.buildpair-last-failed-sha}"

section() {
  printf '\n== %s ==\n' "$1"
}

safe_curl() {
  local url="$1"
  curl --silent --show-error --connect-timeout 3 --max-time 10 "$url" 2>&1 || true
  printf '\n'
}

section "BuildPair repository"
cd "$REPO_DIR" 2>/dev/null || {
  echo "Repository not found: $REPO_DIR"
  exit 1
}
echo "Path: $REPO_DIR"
echo "Branch: $(git branch --show-current 2>/dev/null || echo unknown)"
echo "Local HEAD: $(git rev-parse HEAD 2>/dev/null || echo unknown)"
git fetch --quiet origin main 2>/dev/null || true
echo "Origin main: $(git rev-parse origin/main 2>/dev/null || echo unavailable)"
echo "Working tree:"
git status --short 2>/dev/null || true

section "Runtime configuration presence"
if [[ -f "$ENV_FILE" ]]; then
  echo "Environment file: $ENV_FILE"
  node --env-file="$ENV_FILE" - <<'NODE' 2>/dev/null || true
const names = [
  'EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'DATABASE_URL',
  'GEMINI_API_KEY',
  'RESEND_API_KEY',
  'INVOICE_FROM_EMAIL',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];
for (const name of names) {
  console.log(`${name}: ${process.env[name]?.trim() ? 'configured' : 'MISSING'}`);
}
NODE
else
  echo "Environment file missing: $ENV_FILE"
fi

section "PM2 BuildPair process"
if command -v pm2 >/dev/null 2>&1; then
  pm2 describe buildpair 2>/dev/null | sed -n '1,35p' || echo "PM2 process 'buildpair' not found"
else
  echo "pm2 command not found"
fi

section "Cloudflare tunnel process"
ps -eo pid,cmd | grep -E '[c]loudflared .*tunnel run' || echo "No cloudflared tunnel process found"

section "Automatic deploy timer"
if command -v systemctl >/dev/null 2>&1; then
  systemctl --user --no-pager --full status buildpair-autodeploy.timer 2>&1 | sed -n '1,26p' || true
else
  echo "systemctl not available"
fi

section "Deployment markers"
if [[ -f "$DEPLOYED_SHA_FILE" ]]; then
  echo "Last deployed: $(cat "$DEPLOYED_SHA_FILE")"
else
  echo "Last deployed: marker missing"
fi
if [[ -f "$FAILED_SHA_FILE" ]]; then
  echo "Last failed: $(cat "$FAILED_SHA_FILE")"
else
  echo "Last failed: none recorded"
fi

section "Local health"
safe_curl "http://127.0.0.1:3000/api/health"

section "Local readiness"
safe_curl "http://127.0.0.1:3000/api/readiness"

section "Public Cloudflare health"
echo "$PUBLIC_ORIGIN"
safe_curl "$PUBLIC_ORIGIN/api/health"

section "Public Cloudflare readiness"
safe_curl "$PUBLIC_ORIGIN/api/readiness"

section "Recent automatic deploy log"
if command -v journalctl >/dev/null 2>&1; then
  journalctl --user -u buildpair-autodeploy.service -n 30 --no-pager 2>/dev/null || true
else
  echo "journalctl not available"
fi
