#!/usr/bin/env bash
set -euo pipefail

# Simple helper to push the local runner to Raspberry Pi and execute it there.

MODE="${1:-all}"
PI_USER="${PI_USER:-pi}"
PI_HOST="${PI_HOST:-pi.local}"
PI_DEST="${PI_DEST:-/home/pi/tmp/personal-agent-local-run}"
SSH_OPTS=${SSH_OPTS:-"-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"}

ensure_bundle() {
  if [[ ! -f dist/local-run.js ]]; then
    echo "[pi-dev] dist/local-run.js missing; bundling..." >&2
    npm run --silent bundle:local
  fi
}

sync_to_pi() {
  echo "[pi-dev] Syncing dist/local-run.js to $PI_USER@$PI_HOST:$PI_DEST/" >&2
  ssh $SSH_OPTS "$PI_USER@$PI_HOST" "mkdir -p '$PI_DEST'"
  if command -v rsync >/dev/null 2>&1; then
    rsync -avz -e "ssh $SSH_OPTS" dist/local-run.js dist/local-run.js.map "$PI_USER@$PI_HOST:$PI_DEST/"
  else
    scp $SSH_OPTS dist/local-run.js dist/local-run.js.map "$PI_USER@$PI_HOST:$PI_DEST/"
  fi
}

run_on_pi() {
  # Defaults can be overridden by env
  AGENT_OWNER_=${AGENT_OWNER:-0x4007}
  OWNER_=${OWNER:-ubiquity}
  REPO_=${REPO:-.github-private}
  ISSUE_=${ISSUE:-22}
  BODY_=${BODY:-'@0x4007 remote test'}
  PI_URL_=${PI_URL:-http://127.0.0.1:3000}
  FETCH_TIMEOUT_MS_=${FETCH_TIMEOUT_MS:-15000}
  PI_MINIMAL_=${PI_MINIMAL:-}

  echo "[pi-dev] Executing on $PI_USER@$PI_HOST with PI_URL=$PI_URL_" >&2
  # Escape single quotes for safe single-quoting
  BODY_ESC=$(printf "%s" "$BODY_" | sed "s/'/'\\''/g")
  REMOTE_SCRIPT=$(cat <<'SH'
set -euo pipefail
# ensure node in PATH (nvm or system)
if ! command -v node >/dev/null 2>&1; then
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" || true
  [ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion" || true
fi
if ! command -v node >/dev/null 2>&1; then
  export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"
fi
echo "[remote] node path: $(command -v node || echo not-found)"
echo -n "[remote] node version: "; node -v || true
node "$PI_DEST/local-run.js"
SH
)
  # inject env exports safely
  REMOTE_ENV=$(
    cat <<ENV
export REAL_PI=1
export FETCH_TIMEOUT_MS=$FETCH_TIMEOUT_MS_
export PI_DEST='$PI_DEST'
export AGENT_OWNER='$AGENT_OWNER_'
export OWNER='$OWNER_'
export REPO='$REPO_'
export ISSUE='$ISSUE_'
export BODY='$BODY_ESC'
export PI_URL='$PI_URL_'
export NODE_ENV=local
${PI_MINIMAL_:+export PI_MINIMAL='$PI_MINIMAL_'}
ENV
  )
  FULL_SCRIPT="$REMOTE_ENV
$REMOTE_SCRIPT"
  B64=$(printf '%s' "$FULL_SCRIPT" | base64 | tr -d '\n')
  ssh $SSH_OPTS "$PI_USER@$PI_HOST" "echo '$B64' | base64 -d | bash -s"
}

curl_remote() {
  AGENT_OWNER_=${AGENT_OWNER:-0x4007}
  OWNER_=${OWNER:-ubiquity}
  REPO_=${REPO:-.github-private}
  ISSUE_=${ISSUE:-22}
  SENDER_=${SENDER:-$OWNER_}
  BODY_=${BODY:-"@$AGENT_OWNER_ remote test"}
  ACCESS_MODE_=${ACCESS_MODE:-read-only}
  PI_URL_=${PI_URL:-http://127.0.0.1:3000}

  # Strip leading mention for command text
  CMD_=$(printf "%s" "$BODY_" | sed "s/^@${AGENT_OWNER_}[[:space:]]\{0,1\}//")
  PROMPT_="[mode:${ACCESS_MODE_}] [type:issue] repo:${OWNER_}/${REPO_} issue:${ISSUE_} actor:${SENDER_} \nUser request: ${CMD_} \nInstructions: Provide a helpful, concise answer. Consider repo code and issue discussion. Output plain text suitable for a GitHub comment."

  echo "[pi-dev] curl -> $PI_URL_/api/codex" >&2
  # Build JSON safely and send via base64 to avoid quoting issues over ssh
  esc() { printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'; }
  PROMPT_E=$(esc "$PROMPT_")
  CMD_E=$(esc "$CMD_")
  BODY_E=$(esc "$BODY_")
  JSON_PAYLOAD=$(printf '{"prompt":"%s","comment":"%s","raw_comment":"%s","timeout_ms":30000,"repo":"%s/%s","issue":%s,"post":true}\n' "$PROMPT_E" "$CMD_E" "$BODY_E" "$OWNER_" "$REPO_" "$ISSUE_")
  B64=$(printf '%s' "$JSON_PAYLOAD" | base64 | tr -d '\n')
  ssh $SSH_OPTS "$PI_USER@$PI_HOST" \
    "echo '$B64' | base64 -d | curl -sS -w '\nHTTP %{http_code}\n' -H 'content-type: application/json' -X POST '$PI_URL_/api/codex' --data-binary @-"
}

case "$MODE" in
  all)
    ensure_bundle
    sync_to_pi
    run_on_pi
    ;;
  sync)
    ensure_bundle
    sync_to_pi
    ;;
  run)
    run_on_pi
    ;;
  probe)
    ssh $SSH_OPTS "$PI_USER@$PI_HOST" "set -x; curl -sS http://127.0.0.1:3000/ | head -n 50; echo '---'; \
      curl -sS http://127.0.0.1:3000/api | head -n 50 || true; echo '---'; \
      curl -sS -i http://127.0.0.1:3000/api/codex -X OPTIONS || true; echo '---'; \
      echo '{}' | curl -sS -m 5 -i http://127.0.0.1:3000/api/codex -H 'content-type: application/json' --data-binary @- || true; echo '---'; \
      echo '{\"prompt\":\"hi\"}' | curl -sS -m 5 -i http://127.0.0.1:3000/api/codex -H 'content-type: application/json' --data-binary @- || true; echo '---'; \
      echo '{\"raw\":\"@0x4007 hi\"}' | curl -sS -m 5 -i http://127.0.0.1:3000/api/codex -H 'content-type: application/json' --data-binary @- || true; echo '---'; \
      echo '{\"raw_comment\":\"@0x4007 hi\"}' | curl -sS -m 5 -i http://127.0.0.1:3000/api/codex -H 'content-type: application/json' --data-binary @- || true; echo '---'; \
      echo '{\"comment\":\"@0x4007 hi\"}' | curl -sS -m 5 -i http://127.0.0.1:3000/api/codex -H 'content-type: application/json' --data-binary @- || true"
    ;;
  curl)
    curl_remote
    ;;
  *)
    echo "Usage: $0 [all|sync|run|curl|probe]" >&2
    exit 2
    ;;
esac
