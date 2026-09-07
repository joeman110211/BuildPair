#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/infra/production/docker-compose.yml"
ENV_FILE="$ROOT_DIR/.env.production"

cd "$ROOT_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  echo "Create it from .env.example and fill in the production values before deploying."
  exit 1
fi

required_env=(
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
  EXPO_PUBLIC_API_URL
  EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
  CLERK_SECRET_KEY
  DATABASE_URL
  STRIPE_SECRET_KEY
  STRIPE_BASIC_PRICE_ID
  STRIPE_FEATURED_PRICE_ID
  STRIPE_WEBHOOK_SECRET
  STRIPE_CONNECT_WEBHOOK_SECRET
  GEMINI_API_KEY
  RESEND_API_KEY
  INVOICE_FROM_EMAIL
  SUPPORT_EMAIL
  APP_URL
  CRON_SECRET
  CLOUDINARY_API_KEY
  CLOUDINARY_API_SECRET
)

missing_env=()
for name in "${required_env[@]}"; do
  if ! grep -Eq "^${name}=.+" "$ENV_FILE"; then
    missing_env+=("$name")
  fi
done

if (( ${#missing_env[@]} > 0 )); then
  echo "Production environment is incomplete. Missing/non-empty values required for:"
  printf '  - %s\n' "${missing_env[@]}"
  exit 1
fi

if ! grep -Eq '^APP_URL=https://www\.buildpair\.co\.uk/?$' "$ENV_FILE"; then
  echo "APP_URL must be https://www.buildpair.co.uk for the production deployment."
  exit 1
fi
if ! grep -Eq '^EXPO_PUBLIC_API_URL=https://www\.buildpair\.co\.uk/?$' "$ENV_FILE"; then
  echo "EXPO_PUBLIC_API_URL must be https://www.buildpair.co.uk for the production deployment."
  exit 1
fi
if ! grep -Eq '^BUILDPAIR_PREVIEW_DATA_ENABLED=false$' "$ENV_FILE"; then
  echo "BUILDPAIR_PREVIEW_DATA_ENABLED must be explicitly false in production."
  exit 1
fi

mkdir -p downloads

echo "[BuildPair] Updating source..."
git fetch origin main
git checkout main
git pull --ff-only origin main
export BUILDPAIR_BUILD_SHA="$(git rev-parse HEAD)"
echo "[BuildPair] Release SHA: $BUILDPAIR_BUILD_SHA"

echo "[BuildPair] Building production containers..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" build --pull

echo "[BuildPair] Applying database migrations before switching application traffic..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" run --rm --no-deps app node scripts/migrate.mjs

echo "[BuildPair] Starting production stack..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --remove-orphans

echo "[BuildPair] Checking application health and exact release SHA inside the server..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T app \
  node -e "fetch('http://127.0.0.1:3000/api/health').then(async r=>{const body=await r.json();console.log(JSON.stringify(body));if(!r.ok||body.releaseSha!==process.env.BUILDPAIR_BUILD_SHA)process.exit(1)}).catch(e=>{console.error(e);process.exit(1)})"

echo "[BuildPair] Deployment complete: $BUILDPAIR_BUILD_SHA"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps
