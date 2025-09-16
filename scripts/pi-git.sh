#!/usr/bin/env bash
set -euo pipefail

# Git-based sync to the Raspberry Pi. Always use GitHub as the source of truth.
#
# Usage:
#   scripts/pi-git.sh setup    # clone repo on Pi if missing
#   scripts/pi-git.sh pull     # fetch+pull current branch on Pi repo
#   scripts/pi-git.sh run      # run local harness on Pi via Bun
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
  run)
    # Defaults can be overridden by env
    AGENT_OWNER_=${AGENT_OWNER:-0x4007}
    OWNER_=${OWNER:-ubiquity}
    REPO_=${REPO:-.github-private}
    ISSUE_=${ISSUE:-22}
    BODY_=${BODY:-'@0x4007 remote test'}
    PI_URL_=${PI_URL:-http://127.0.0.1:3000}
    FETCH_TIMEOUT_MS_=${FETCH_TIMEOUT_MS:-15000}
    PI_MINIMAL_=${PI_MINIMAL:-}

    echo "[pi-git] Running Bun harness on $PI_USER@$PI_HOST in $PI_DIR (branch=$BRANCH)" >&2
    # Escape single quotes for safe embedding
    BODY_ESC=$(printf "%s" "$BODY_" | sed "s/'/'\\''/g")
    remote_run "set -euo pipefail; \
      cd '$PI_DIR' 2>/dev/null || { echo '[remote] repo missing; run setup' >&2; exit 2; }; \
      if ! command -v bun >/dev/null 2>&1; then echo '[remote] bun not found in PATH'; exit 127; fi; \
      echo -n '[remote] bun version: '; bun --version; \
      export REAL_PI=1 FETCH_TIMEOUT_MS=$FETCH_TIMEOUT_MS_ AGENT_OWNER='$AGENT_OWNER_' OWNER='$OWNER_' REPO='$REPO_' ISSUE='$ISSUE_' BODY='$BODY_ESC' PI_URL='$PI_URL_' NODE_ENV=local; \
      ${PI_MINIMAL_:+export PI_MINIMAL='$PI_MINIMAL_'; } \
      bun scripts/local-run.ts"
    ;;
  *)
    echo "Usage: $0 [setup|pull|run]" >&2
    exit 2
    ;;
esac
