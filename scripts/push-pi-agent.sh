#!/usr/bin/env bash
set -euo pipefail

# Push the local pi-agent repo, then trigger a pull on the Pi.
#
# Env:
#   PI_AGENT_LOCAL_DIR  (required) path to local pi-agent clone
#   REMOTE              (default: origin)
#   BRANCH              (default: current branch in PI_AGENT_LOCAL_DIR)
#   PI_USER             (default: pi)
#   PI_HOST             (default: pi.local)

if [[ -z "${PI_AGENT_LOCAL_DIR:-}" ]]; then
  echo "[push-pi-agent] PI_AGENT_LOCAL_DIR is required (path to local pi-agent clone)" >&2
  exit 2
fi

if [[ ! -d "$PI_AGENT_LOCAL_DIR/.git" ]]; then
  echo "[push-pi-agent] Not a git repo: $PI_AGENT_LOCAL_DIR" >&2
  exit 2
fi

REMOTE="${REMOTE:-origin}"
BRANCH="${BRANCH:-}"
if [[ -z "$BRANCH" ]]; then
  BRANCH=$(git -C "$PI_AGENT_LOCAL_DIR" rev-parse --abbrev-ref HEAD)
fi

echo "[push-pi-agent] Pushing $PI_AGENT_LOCAL_DIR -> $REMOTE $BRANCH" >&2
git -C "$PI_AGENT_LOCAL_DIR" push "$REMOTE" "$BRANCH"

echo "[push-pi-agent] Push ok. Triggering Pi pull ($BRANCH)." >&2
env BRANCH="$BRANCH" PI_USER="${PI_USER:-pi}" PI_HOST="${PI_HOST:-pi.local}" \
  scripts/pi-agent-git.sh pull

echo "[push-pi-agent] Done." >&2

