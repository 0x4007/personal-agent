#!/usr/bin/env bash
set -euo pipefail

# Git-based sync to the Raspberry Pi. Always use GitHub as the source of truth.
#
# Usage:
#   scripts/pi-git.sh setup   # clone repo on Pi if missing
#   scripts/pi-git.sh pull    # fetch+pull current branch on Pi repo
#
# Env overrides:
#   PI_USER   (default: pi)
#   PI_HOST   (default: pi.local)
#   PI_DIR    (default: /home/pi/repos/personal-agent)
#   BRANCH    (default: current local branch name)
#   GIT_URL   (default: https://github.com/0x4007/personal-agent.git)

MODE="${1:-pull}"
PI_USER="${PI_USER:-pi}"
PI_HOST="${PI_HOST:-pi.local}"
PI_DIR="${PI_DIR:-/home/pi/repos/personal-agent}"
SSH_OPTS=${SSH_OPTS:-"-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"}

# Detect current branch locally if not provided
BRANCH="${BRANCH:-}"
if [[ -z "$BRANCH" ]]; then
  if command -v git >/dev/null 2>&1; then
    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "development")
  else
    BRANCH="development"
  fi
fi

GIT_URL="${GIT_URL:-https://github.com/0x4007/personal-agent.git}"

remote_run() {
  local cmd="$1"
  ssh $SSH_OPTS "$PI_USER@$PI_HOST" "$cmd"
}

case "$MODE" in
  setup)
    echo "[pi-git] Ensuring repo at $PI_USER@$PI_HOST:$PI_DIR (branch=$BRANCH)" >&2
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
    echo "[pi-git] Pulling latest at $PI_USER@$PI_HOST:$PI_DIR (branch=$BRANCH)" >&2
    remote_run "set -e; cd '$PI_DIR' 2>/dev/null || { echo '[remote] repo missing; run setup' >&2; exit 2; }; \
      git fetch --all --prune; \
      git checkout '$BRANCH' || git checkout -b '$BRANCH'; \
      git reset --hard 'origin/'"$BRANCH"; \
      git rev-parse --short HEAD"
    ;;
  *)
    echo "Usage: $0 [setup|pull]" >&2
    exit 2
    ;;
esac

