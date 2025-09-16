#!/usr/bin/env bash
set -euo pipefail

# Git-based sync helper for the Raspberry Pi "pi-agent" server repo.
# Defaults target the production repo/dir and main branch.
#
# Usage:
#   scripts/pi-agent-git.sh setup     # clone repo on Pi if missing
#   scripts/pi-agent-git.sh pull      # fetch/reset to target branch on Pi
#   scripts/pi-agent-git.sh restart   # optional: restart systemd service (best-effort)
#
# Env overrides:
#   PI_USER   (default: pi)
#   PI_HOST   (default: pi.local)
#   PI_DIR    (default: /home/pi/repos/pi-agent)
#   BRANCH    (default: main)
#   GIT_URL   (default: https://github.com/0x4007/pi-agent.git)
#   SSH_OPTS  (default: -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null)

MODE="${1:-pull}"
PI_USER="${PI_USER:-pi}"
PI_HOST="${PI_HOST:-pi.local}"
PI_DIR="${PI_DIR:-/home/pi/repos/pi-agent}"
SSH_OPTS=${SSH_OPTS:-"-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"}

# Default to main for pi-agent; override with BRANCH if desired
BRANCH="${BRANCH:-main}"
GIT_URL="${GIT_URL:-https://github.com/0x4007/pi-agent.git}"

remote_run() {
  local cmd="$1"
  ssh $SSH_OPTS "$PI_USER@$PI_HOST" "$cmd"
}

case "$MODE" in
  setup)
    echo "[pi-agent-git] Ensuring repo at $PI_USER@$PI_HOST:$PI_DIR (branch=$BRANCH)" >&2
    remote_run "set -e; mkdir -p '$(dirname "$PI_DIR")'; \
      if [[ ! -d '$PI_DIR/.git' ]]; then \
        echo '[remote] cloning $GIT_URL into $PI_DIR'; \
        git clone '$GIT_URL' '$PI_DIR'; \
      else \
        echo '[remote] repo exists: $PI_DIR'; \
      fi; \
      cd '$PI_DIR'; \
      git fetch --all --prune; \
      git checkout '$BRANCH' || git checkout -b '$BRANCH'; \
      git reset --hard 'origin/'"$BRANCH"; \
      git rev-parse --short HEAD"
    ;;
  pull)
    echo "[pi-agent-git] Pulling latest at $PI_USER@$PI_HOST:$PI_DIR (branch=$BRANCH)" >&2
    remote_run "set -e; cd '$PI_DIR' 2>/dev/null || { echo '[remote] repo missing; run setup' >&2; exit 2; }; \
      git fetch --all --prune; \
      git checkout '$BRANCH' || git checkout -b '$BRANCH'; \
      git reset --hard 'origin/'"$BRANCH"; \
      git rev-parse --short HEAD"
    ;;
  restart)
    echo "[pi-agent-git] Attempting to restart pi-agent service on $PI_USER@$PI_HOST" >&2
    remote_run "set -e; \
      if command -v systemctl >/dev/null 2>&1; then \
        sudo -n systemctl restart pi-agent-deno.service || systemctl --user restart pi-agent-deno.service || true; \
        (systemctl is-active pi-agent-deno.service || systemctl --user is-active pi-agent-deno.service || true); \
      else \
        echo '[remote] systemctl not available; skipping restart' >&2; \
      fi"
    ;;
  *)
    echo "Usage: $0 [setup|pull|restart]" >&2
    exit 2
    ;;
esac

