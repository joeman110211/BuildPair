#!/usr/bin/env bash
set -Eeuo pipefail

# Installs BuildPair automatic deploys for the existing Chromebook production runtime:
# PM2 runs BuildPair, and the named Cloudflare tunnel is managed separately.
# This installer adds a user-level systemd timer that checks GitHub main and
# deploys new production revisions safely.

ACTION="${1:-install}"
REPO_DIR="${BUILDPAIR_REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
SYSTEMD_DIR="${XDG_CONFIG_HOME:-$HOME/.config/systemd/user}"
SERVICE_FILE="$SYSTEMD_DIR/buildpair-autodeploy.service"
TIMER_FILE="$SYSTEMD_DIR/buildpair-autodeploy.timer"
OLD_HOST_SERVICE="$SYSTEMD_DIR/buildpair-host.service"
DEPLOY_SCRIPT="$REPO_DIR/scripts/deploy-chromebook.sh"

require_systemd_user() {
  if ! command -v systemctl >/dev/null 2>&1; then
    echo "systemctl is not available in this Linux environment." >&2
    exit 1
  fi
  if ! systemctl --user show-environment >/dev/null 2>&1; then
    echo "The user systemd session is not available. Open the Chromebook Linux Terminal and run this installer there." >&2
    exit 1
  fi
}

runtime_path() {
  local current_path="${PATH:-/usr/local/bin:/usr/bin:/bin}"
  local pm2_bin=""
  local pm2_dir=""

  pm2_bin="$(command -v pm2 2>/dev/null || true)"
  if [[ -z "$pm2_bin" ]]; then
    echo "PM2 is not available in this terminal. Start the normal Chromebook Linux Terminal and ensure 'pm2 status' works first." >&2
    return 1
  fi

  pm2_dir="$(dirname "$pm2_bin")"
  case ":$current_path:" in
    *":$pm2_dir:"*) ;;
    *) current_path="$pm2_dir:$current_path" ;;
  esac

  printf '%s\n' "$current_path"
}

install_timer() {
  require_systemd_user
  cd "$REPO_DIR"
  git config core.fileMode false
  mkdir -p "$SYSTEMD_DIR"

  local service_path
  service_path="$(runtime_path)"

  # Remove the superseded Quick-Tunnel supervisor if it was installed.
  systemctl --user disable --now buildpair-host.service >/dev/null 2>&1 || true
  rm -f "$OLD_HOST_SERVICE"

  cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=BuildPair Chromebook production automatic deploy
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
WorkingDirectory=$REPO_DIR
Environment=BUILDPAIR_REPO_DIR=$REPO_DIR
Environment=BUILDPAIR_DEPLOY_BRANCH=main
Environment=BUILDPAIR_PUBLIC_ORIGIN=https://www.buildpair.co.uk
Environment=BUILDPAIR_HEALTH_URL=https://www.buildpair.co.uk/api/health
Environment=BUILDPAIR_READINESS_URL=https://www.buildpair.co.uk/api/readiness
Environment="PATH=$service_path"
ExecStart=/usr/bin/env bash $DEPLOY_SCRIPT
TimeoutStartSec=20min
Nice=10
EOF

  cat > "$TIMER_FILE" <<'EOF'
[Unit]
Description=Check GitHub for BuildPair production updates

[Timer]
OnBootSec=1min
OnUnitActiveSec=1min
RandomizedDelaySec=10s
Persistent=true
Unit=buildpair-autodeploy.service

[Install]
WantedBy=timers.target
EOF

  systemctl --user daemon-reload
  systemctl --user enable --now buildpair-autodeploy.timer

  echo
  echo "BuildPair production automatic deployment is enabled."
  echo "The Chromebook will check origin/main roughly every minute while Linux is running."
  echo "New revisions are typechecked, tested, migrated, rebuilt, restarted through PM2 and health-checked before being marked deployed."
  echo "Existing PM2 and Cloudflare services are left in place."
  echo "The deploy service is using the same Node/PM2 runtime path as this terminal."
  echo
  systemctl --user --no-pager --full status buildpair-autodeploy.timer || true
}

show_status() {
  require_systemd_user
  systemctl --user --no-pager --full status buildpair-autodeploy.timer || true
  echo
  systemctl --user --no-pager --full status buildpair-autodeploy.service || true
  echo
  /usr/bin/env bash "$REPO_DIR/scripts/chromebook-status.sh" || true
}

run_now() {
  require_systemd_user
  systemctl --user reset-failed buildpair-autodeploy.service >/dev/null 2>&1 || true
  systemctl --user start buildpair-autodeploy.service
  systemctl --user --no-pager --full status buildpair-autodeploy.service || true
}

uninstall_timer() {
  require_systemd_user
  systemctl --user disable --now buildpair-autodeploy.timer >/dev/null 2>&1 || true
  systemctl --user stop buildpair-autodeploy.service >/dev/null 2>&1 || true
  systemctl --user disable --now buildpair-host.service >/dev/null 2>&1 || true
  rm -f "$SERVICE_FILE" "$TIMER_FILE" "$OLD_HOST_SERVICE"
  systemctl --user daemon-reload
  systemctl --user reset-failed >/dev/null 2>&1 || true
  echo "BuildPair automatic deployment has been removed. PM2 and Cloudflare were not touched."
}

case "$ACTION" in
  install) install_timer ;;
  status) show_status ;;
  run-now|run) run_now ;;
  uninstall|remove) uninstall_timer ;;
  *)
    echo "Usage: $0 {install|status|run-now|uninstall}" >&2
    exit 2
    ;;
esac
